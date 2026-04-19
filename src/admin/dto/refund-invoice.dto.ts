import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RefundInvoiceDto {
  @ApiProperty({
    description: 'Short reason for the refund (free text, goes to audit log + Stripe metadata).',
    example: 'Mission cancelled by employer after dispute resolution',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Partial refund amount in cents. Omit for a full refund of the invoice total.',
    example: 5000,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @ApiPropertyOptional({
    description:
      'If true and a Stripe Connect transfer to the worker already fired, also create a transfer reversal. Default: false (refund from platform balance, worker keeps payout — used when the mission was completed correctly but the employer is being refunded as a courtesy).',
    example: false,
  })
  @IsOptional()
  reverseWorkerTransfer?: boolean;
}

export class RefundInvoiceResponseDto {
  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  stripeRefundId!: string;

  @ApiProperty()
  amountRefundedCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({
    enum: ['REFUNDED'],
    description:
      'Always REFUNDED after a successful refund. The amountRefundedCents and the invoice subtotal together indicate whether it was partial or full — the enum itself does not distinguish.',
  })
  invoiceStatus!: 'REFUNDED';

  @ApiPropertyOptional()
  workerTransferReversalId?: string;

  @ApiProperty({
    description: 'Refund was partial (true) or full (false) — convenience flag derived from amountRefundedCents vs invoice.subtotalCents.',
  })
  partial!: boolean;
}

