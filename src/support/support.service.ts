import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupportTicketDto,
  AddTicketMessageDto,
  SupportTicketResponseDto,
  TicketListResponseDto,
} from './dto';
import { RequestContext } from '../common/middleware/request-context.middleware';

/**
 * PR-00: Support Tickets Service
 * 
 * Handles in-app customer support ticket creation and management.
 * - Ticket creation with device tracking
 * - Message threading
 * - Status management
 * - Audit logging for trust
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    dto: CreateSupportTicketDto,
    context: RequestContext,
  ): Promise<SupportTicketResponseDto> {
    this.logger.log(`Creating support ticket for user ${userId.substring(0, 8)}...`);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority: dto.priority || 'NORMAL',
        missionId: dto.missionId,
        
        // Device/request context for fraud detection
        deviceId: context.deviceIdHash,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    // Log to trust audit
    await this.logTrustAudit({
      category: 'ADMIN_ACTION',
      action: 'support_ticket_created',
      actorId: userId,
      actorType: 'user',
      targetType: 'support_ticket',
      targetId: ticket.id,
      context,
    });

    this.logger.log(`Support ticket created: ${ticket.id}`);

    return this.mapToResponse(ticket);
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<TicketListResponseDto> {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { userId },
        include: { messages: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where: { userId } }),
    ]);

    return {
      tickets: tickets.map((t) => this.mapToResponse(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get ticket by ID (with access check)
   */
  async getTicketById(
    ticketId: string,
    userId: string,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Only owner can access their ticket (admins handled separately)
    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(ticket);
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ticketId: string,
    userId: string,
    dto: AddTicketMessageDto,
    context: RequestContext,
  ): Promise<SupportTicketResponseDto> {
    // Verify ticket exists and user has access
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      throw new ForbiddenException('Cannot add message to closed ticket');
    }

    // Create message and update ticket status
    await this.prisma.$transaction([
      this.prisma.supportTicketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          senderType: 'user',
          content: dto.content,
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'WAITING_ADMIN' },
      }),
    ]);

    // Log to trust audit
    await this.logTrustAudit({
      category: 'ADMIN_ACTION',
      action: 'support_ticket_message_added',
      actorId: userId,
      actorType: 'user',
      targetType: 'support_ticket',
      targetId: ticketId,
      context,
    });

    return this.getTicketById(ticketId, userId);
  }

  /**
   * Close ticket (user can close their own tickets)
   */
  async closeTicket(
    ticketId: string,
    userId: string,
    context: RequestContext,
  ): Promise<SupportTicketResponseDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' },
    });

    // Log to trust audit
    await this.logTrustAudit({
      category: 'ADMIN_ACTION',
      action: 'support_ticket_closed_by_user',
      actorId: userId,
      actorType: 'user',
      targetType: 'support_ticket',
      targetId: ticketId,
      context,
    });

    return this.getTicketById(ticketId, userId);
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponse(ticket: any): SupportTicketResponseDto {
    return {
      id: ticket.id,
      userId: ticket.userId,
      missionId: ticket.missionId || undefined,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assignedTo || undefined,
      resolvedAt: ticket.resolvedAt?.toISOString() || undefined,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messages: ticket.messages?.map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        senderType: m.senderType,
        content: m.content,
        attachments: m.attachments || undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Log trust audit event
   */
  private async logTrustAudit(params: {
    category: string;
    action: string;
    actorId?: string;
    actorType?: string;
    targetType?: string;
    targetId?: string;
    context: RequestContext;
  }): Promise<void> {
    try {
      await this.prisma.trustAuditLog.create({
        data: {
          category: params.category as any,
          action: params.action,
          actorId: params.actorId,
          actorType: params.actorType,
          targetType: params.targetType,
          targetId: params.targetId,
          ipAddress: params.context.ipAddress,
          userAgent: params.context.userAgent,
          deviceId: params.context.deviceIdHash,
          correlationId: params.context.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log trust audit: ${error}`);
      // Don't throw - audit logging should not break main flow
    }
  }
}

