import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import {
  RefundInvoiceDto,
  RefundInvoiceResponseDto,
} from './dto/refund-invoice.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly stripe?: Stripe;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : undefined;
  }

  async reconcilePayments(
    adminId: string,
    options?: { startDate?: Date; endDate?: Date },
  ) {
    return this.paymentsService.reconcilePayments(adminId, options);
  }

  /**
   * Admin-only emergency refund. Runbook: docs/runbooks/admin-refund.md.
   *
   * - Invoice must be PAID.
   * - Defaults to a full refund; pass `amountCents` for partial.
   * - Stripe metadata records `adminId` + `reason` for the Stripe dashboard.
   * - If `reverseWorkerTransfer` is true and a Stripe Connect transfer to
   *   the worker already fired, a transfer reversal is created so funds
   *   come back to the platform. Default false — the platform absorbs
   *   the refund and the worker keeps the payout, which is the right call
   *   for goodwill refunds after a completed mission.
   * - Invoice status -> REFUNDED (enum doesn't distinguish partial). The
   *   exact amount + reason + refundId are appended to `invoice.metadata`.
   */
  async refundInvoice(
    invoiceId: string,
    dto: RefundInvoiceDto,
    adminId: string,
  ): Promise<RefundInvoiceResponseDto> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe not configured');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        subtotalCents: true,
        totalCents: true,
        currency: true,
        status: true,
        stripePaymentIntentId: true,
        localMissionId: true,
        missionId: true,
        metadata: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== 'PAID') {
      throw new BadRequestException(
        `Cannot refund invoice in status ${invoice.status}. Only PAID invoices are refundable.`,
      );
    }

    if (!invoice.stripePaymentIntentId) {
      throw new BadRequestException(
        `Invoice ${invoiceId} has no stripePaymentIntentId — cannot refund via Stripe.`,
      );
    }

    const amountCents = dto.amountCents ?? invoice.totalCents;
    if (amountCents > invoice.totalCents) {
      throw new BadRequestException(
        `Refund amount ${amountCents} exceeds invoice total ${invoice.totalCents}.`,
      );
    }

    this.logger.log(
      `Admin ${adminId} refunding invoice ${invoiceId} for ${amountCents} ${invoice.currency} — reason: ${dto.reason}`,
    );

    // 1. Stripe refund on the PaymentIntent.
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: invoice.stripePaymentIntentId,
        amount: amountCents,
        reason: 'requested_by_customer',
        metadata: {
          invoiceId,
          adminId,
          adminReason: dto.reason.slice(0, 500),
          workonRefund: 'true',
        },
      },
      {
        idempotencyKey: `workon_refund_${invoiceId}_${amountCents}`,
      },
    );

    // 2. Optional: reverse the worker transfer. We walk transfers on the
    //    mission's transfer_group so we pick the correct payout even when
    //    multiple transfers exist for the mission.
    let reversalId: string | undefined;
    if (dto.reverseWorkerTransfer && invoice.localMissionId) {
      try {
        const transferGroup = `mission_${invoice.localMissionId}`;
        const transfers = await this.stripe.transfers.list({
          transfer_group: transferGroup,
          limit: 5,
        });
        const transfer = transfers.data.find(
          (t) => t.amount_reversed === 0 && t.amount > 0,
        );
        if (transfer) {
          const reversal = await this.stripe.transfers.createReversal(
            transfer.id,
            {
              amount: Math.min(amountCents, transfer.amount),
              metadata: {
                invoiceId,
                refundId: refund.id,
                adminId,
              },
            },
            {
              idempotencyKey: `workon_transfer_reversal_${refund.id}`,
            },
          );
          reversalId = reversal.id;
          this.logger.log(
            `Reversed ${reversal.amount} ${invoice.currency} on transfer ${transfer.id} (reversal ${reversalId}).`,
          );
        } else {
          this.logger.warn(
            `reverseWorkerTransfer requested but no unreversed transfer found in group ${transferGroup}.`,
          );
        }
      } catch (err) {
        // Refund already landed — failing the reversal must not rewind the
        // refund. We log loudly so ops runbook can deal with it.
        this.logger.error(
          `Refund ${refund.id} succeeded but worker transfer reversal failed: ${err instanceof Error ? err.message : String(err)}. MANUAL FOLLOW-UP REQUIRED.`,
        );
      }
    }

    // 3. Update the invoice — append refund entry to metadata.
    type JsonValue =
      | string
      | number
      | boolean
      | null
      | { [key: string]: JsonValue }
      | JsonValue[];
    const prevMeta =
      invoice.metadata &&
      typeof invoice.metadata === 'object' &&
      !Array.isArray(invoice.metadata)
        ? (invoice.metadata as { [key: string]: JsonValue })
        : {};
    const refundedHistory: JsonValue[] = Array.isArray(prevMeta.refunds)
      ? (prevMeta.refunds as JsonValue[])
      : [];
    const newEntry: { [key: string]: JsonValue } = {
      stripeRefundId: refund.id,
      amountCents,
      currency: invoice.currency,
      reason: dto.reason,
      adminId,
      reversalId: reversalId ?? null,
      at: new Date().toISOString(),
    };
    const nextMetadata: { [key: string]: JsonValue } = {
      ...prevMeta,
      refunds: [...refundedHistory, newEntry],
    };

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'REFUNDED',
        metadata: nextMetadata,
      },
    });

    const partial = amountCents < invoice.totalCents;

    return {
      invoiceId,
      stripeRefundId: refund.id,
      amountRefundedCents: amountCents,
      currency: invoice.currency,
      invoiceStatus: 'REFUNDED',
      workerTransferReversalId: reversalId,
      partial,
    };
  }
}
