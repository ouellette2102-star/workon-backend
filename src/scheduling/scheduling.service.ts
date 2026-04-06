import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, RecurrenceRule, Prisma } from '@prisma/client';

/**
 * Scheduling Service
 * PR-10: Scheduling & Recurrence Primitives
 *
 * Manages:
 * - Recurring mission templates
 * - Worker availability slots
 * - Booking creation and management
 *
 * NOTE: No complex UI yet. This is the backend foundation.
 */
@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // RECURRING MISSION TEMPLATES
  // ========================================

  /**
   * Create a recurring mission template for a worker
   */
  async createRecurringTemplate(data: {
    workerId: string;
    title: string;
    description: string;
    categoryId: string;
    priceType: string;
    price: number;
    duration: number;
    recurrenceRule: RecurrenceRule;
    recurrenceData?: Record<string, unknown>;
    maxOccurrences?: number;
    validFrom?: Date;
    validUntil?: Date;
  }) {
    // Verify worker exists
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: data.workerId },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const template = await this.prisma.recurringMissionTemplate.create({
      data: {
        workerId: data.workerId,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        priceType: data.priceType,
        price: data.price,
        duration: data.duration,
        recurrenceRule: data.recurrenceRule,
        recurrenceData: data.recurrenceData as Prisma.InputJsonValue,
        maxOccurrences: data.maxOccurrences,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
      include: { category: true },
    });

    this.logger.log(`Created recurring template ${template.id} for worker ${data.workerId}`);
    return template;
  }

  /**
   * Get all active templates for a worker
   */
  async getWorkerTemplates(workerId: string) {
    return this.prisma.recurringMissionTemplate.findMany({
      where: {
        workerId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deactivate a recurring template
   */
  async deactivateTemplate(templateId: string, workerId: string): Promise<void> {
    const template = await this.prisma.recurringMissionTemplate.findFirst({
      where: { id: templateId, workerId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.recurringMissionTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated template ${templateId}`);
  }

  /**
   * Generate missions from a recurring template
   * Creates LocalMission instances for the next N occurrences
   * Includes deduplication: skips dates that already have a mission with the same title
   */
  async generateMissionsFromTemplate(
    templateId: string,
    workerId: string,
    options?: { count?: number },
  ) {
    const template = await this.prisma.recurringMissionTemplate.findFirst({
      where: { id: templateId, workerId, isActive: true },
      include: { worker: { include: { user: true } } },
    });

    if (!template) {
      throw new NotFoundException('Active template not found');
    }

    const count = Math.min(options?.count || 4, 12); // Max 12 at a time
    const now = new Date();
    const dates = this.calculateNextDates(template.recurrenceRule, now, count);

    const created: string[] = [];

    for (const scheduledDate of dates) {
      // Deduplication: check if mission already exists for this date + title
      const existing = await this.prisma.localMission.findFirst({
        where: {
          title: template.title,
          createdByUserId: workerId,
          createdAt: {
            gte: new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        this.logger.log(`Skipping duplicate for ${template.title} on ${scheduledDate.toISOString()}`);
        continue;
      }

      const missionId = `lm_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      await this.prisma.localMission.create({
        data: {
          id: missionId,
          title: template.title,
          description: `${template.description} (récurrent)`,
          category: template.categoryId,
          price: template.price,
          latitude: 0,
          longitude: 0,
          city: '',
          createdByUserId: workerId,
          status: 'open',
          updatedAt: new Date(),
        },
      });

      created.push(missionId);
    }

    this.logger.log(`Generated ${created.length} missions from template ${templateId}`);
    return { templateId, generated: created.length, missionIds: created };
  }

  /**
   * Calculate next occurrence dates based on recurrence rule
   */
  private calculateNextDates(rule: RecurrenceRule, from: Date, count: number): Date[] {
    const dates: Date[] = [];
    const current = new Date(from);

    for (let i = 0; i < count; i++) {
      switch (rule) {
        case RecurrenceRule.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;
        case RecurrenceRule.BIWEEKLY:
          current.setDate(current.getDate() + 14);
          break;
        case RecurrenceRule.MONTHLY:
          current.setMonth(current.getMonth() + 1);
          break;
        case RecurrenceRule.CUSTOM:
          current.setDate(current.getDate() + 7); // Default to weekly for custom
          break;
      }
      dates.push(new Date(current));
    }

    return dates;
  }

  // ========================================
  // AVAILABILITY SLOTS
  // ========================================

  /**
   * Set recurring availability for a worker
   */
  async setAvailability(data: {
    workerId: string;
    slots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      timezone?: string;
    }>;
  }) {
    // Verify worker exists
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: data.workerId },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const slot of data.slots) {
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        throw new BadRequestException('Invalid time format. Use HH:MM (24h format)');
      }

      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new BadRequestException('dayOfWeek must be 0-6 (Sunday-Saturday)');
      }

      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException('startTime must be before endTime');
      }
    }

    // Delete existing recurring availability and create new
    await this.prisma.$transaction([
      this.prisma.availabilitySlot.deleteMany({
        where: { workerId: data.workerId, isRecurring: true },
      }),
      ...data.slots.map((slot) =>
        this.prisma.availabilitySlot.create({
          data: {
            workerId: data.workerId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: slot.timezone ?? 'America/Toronto',
            isRecurring: true,
          },
        }),
      ),
    ]);

    this.logger.log(`Updated availability for worker ${data.workerId} (${data.slots.length} slots)`);

    return this.getWorkerAvailability(data.workerId);
  }

  /**
   * Block specific time off
   */
  async blockTimeOff(data: {
    workerId: string;
    date: Date;
    startTime: string;
    endTime: string;
    timezone?: string;
  }) {
    const slot = await this.prisma.availabilitySlot.create({
      data: {
        workerId: data.workerId,
        dayOfWeek: data.date.getDay(),
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone ?? 'America/Toronto',
        isRecurring: false,
        specificDate: data.date,
        isBlocked: true,
      },
    });

    this.logger.log(`Blocked time off for worker ${data.workerId} on ${data.date.toISOString()}`);
    return slot;
  }

  /**
   * Get worker availability
   */
  async getWorkerAvailability(workerId: string) {
    const slots = await this.prisma.availabilitySlot.findMany({
      where: { workerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Group by type
    const recurring = slots.filter((s) => s.isRecurring && !s.isBlocked);
    const blocked = slots.filter((s) => s.isBlocked);
    const specific = slots.filter((s) => !s.isRecurring && !s.isBlocked);

    return { recurring, blocked, specific };
  }

  /**
   * Check if a worker is available at a specific time
   */
  async isWorkerAvailable(
    workerId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    const dayOfWeek = scheduledAt.getDay();
    const timeStr = scheduledAt.toTimeString().slice(0, 5); // "HH:MM"
    const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    // Check for blocked time
    const blocked = await this.prisma.availabilitySlot.findFirst({
      where: {
        workerId,
        isBlocked: true,
        specificDate: {
          gte: new Date(scheduledAt.toDateString()),
          lt: new Date(new Date(scheduledAt.toDateString()).getTime() + 24 * 60 * 60 * 1000),
        },
        startTime: { lte: endTimeStr },
        endTime: { gte: timeStr },
      },
    });

    if (blocked) {
      return false;
    }

    // Check for existing bookings
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        workerId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        scheduledAt: { lt: endTime },
        endAt: { gt: scheduledAt },
      },
    });

    if (existingBooking) {
      return false;
    }

    // Check recurring availability
    const available = await this.prisma.availabilitySlot.findFirst({
      where: {
        workerId,
        isRecurring: true,
        isBlocked: false,
        dayOfWeek,
        startTime: { lte: timeStr },
        endTime: { gte: endTimeStr },
      },
    });

    return !!available;
  }

  // ========================================
  // BOOKINGS
  // ========================================

  /**
   * Create a booking
   */
  async createBooking(data: {
    clientId: string;
    workerId: string;
    templateId?: string;
    title: string;
    description?: string;
    scheduledAt: Date;
    duration: number;
    price: number;
    priceType: string;
    timezone?: string;
  }) {
    // Check worker availability
    const isAvailable = await this.isWorkerAvailable(data.workerId, data.scheduledAt, data.duration);

    if (!isAvailable) {
      throw new BadRequestException('Worker is not available at the requested time');
    }

    const endAt = new Date(data.scheduledAt.getTime() + data.duration * 60 * 1000);

    const booking = await this.prisma.booking.create({
      data: {
        clientId: data.clientId,
        workerId: data.workerId,
        templateId: data.templateId,
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        endAt,
        timezone: data.timezone ?? 'America/Toronto',
        price: data.price,
        priceType: data.priceType,
        status: BookingStatus.PENDING,
      },
      include: {
        worker: { include: { user: true } },
        template: true,
      },
    });

    this.logger.log(`Created booking ${booking.id} for client ${data.clientId} with worker ${data.workerId}`);
    return booking;
  }

  /**
   * Confirm a booking (worker accepts)
   */
  async confirmBooking(bookingId: string, workerId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, workerId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`Cannot confirm booking in ${booking.status} status`);
    }

    // Create a linked LocalMission for this booking (Booking → Mission pipeline)
    const missionId = `lm_bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Fetch client geolocation if available
    let clientLat = 0;
    let clientLng = 0;
    let clientCity = '';
    if (booking.localClientId) {
      const client = await this.prisma.localUser.findUnique({
        where: { id: booking.localClientId },
        select: { latitude: true, longitude: true, city: true },
      });
      if (client) {
        clientLat = client.latitude ?? 0;
        clientLng = client.longitude ?? 0;
        clientCity = client.city ?? '';
      }
    }

    try {
      await this.prisma.localMission.create({
        data: {
          id: missionId,
          title: booking.title,
          description: booking.description || `Booking confirmé: ${booking.title}`,
          category: 'booking',
          price: booking.price,
          latitude: clientLat,
          longitude: clientLng,
          city: clientCity,
          createdByUserId: booking.localClientId || booking.clientId,
          assignedToUserId: workerId,
          status: 'assigned',
          updatedAt: new Date(),
        },
      });

      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          localMissionId: missionId,
        },
      });

      this.logger.log(`Booking ${bookingId} confirmed → LocalMission ${missionId} created`);
    } catch (error) {
      // If mission creation fails, still confirm the booking
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });
      this.logger.warn(`Booking ${bookingId} confirmed but mission creation failed: ${error}`);
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(`Cannot cancel booking in ${booking.status} status`);
    }

    // Verify the user is either the client or the worker
    const isClient = booking.clientId === userId;
    const isWorker = await this.prisma.workerProfile.findFirst({
      where: { id: booking.workerId, userId },
    });

    if (!isClient && !isWorker) {
      throw new BadRequestException('Only the client or worker can cancel this booking');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
      },
    });

    this.logger.log(`Booking ${bookingId} cancelled by ${userId}`);
  }

  /**
   * Get bookings for a client
   */
  async getClientBookings(clientId: string, options?: { status?: BookingStatus; upcoming?: boolean }) {
    const where: Record<string, unknown> = { clientId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        worker: { include: { user: true } },
        template: { include: { category: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get bookings for a worker
   */
  async getWorkerBookings(workerId: string, options?: { status?: BookingStatus; upcoming?: boolean }) {
    const where: Record<string, unknown> = { workerId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        client: true,
        template: { include: { category: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Mark booking as completed
   */
  async completeBooking(bookingId: string, workerId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, workerId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException(`Cannot complete booking in ${booking.status} status`);
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    });

    // Create Invoice from completed booking (Booking → Invoice pipeline)
    if (booking.price > 0) {
      const PLATFORM_FEE_PERCENT = 0.15;
      const subtotalCents = Math.round(booking.price * 100);
      const platformFeeCents = Math.round(subtotalCents * PLATFORM_FEE_PERCENT);
      const totalCents = subtotalCents + platformFeeCents;

      try {
        const invoice = await this.prisma.invoice.create({
          data: {
            localMissionId: booking.localMissionId || undefined,
            payerUserId: booking.clientId,
            payerLocalUserId: booking.localClientId || undefined,
            subtotalCents,
            platformFeeCents,
            totalCents,
            currency: 'CAD',
            description: `Booking: ${booking.title}`,
            metadata: { bookingId: booking.id },
          },
        });
        this.logger.log(`Invoice ${invoice.id} created for booking ${bookingId} (${totalCents / 100} CAD)`);
      } catch (error) {
        // Don't fail booking completion if invoice creation fails
        this.logger.error(`Failed to create invoice for booking ${bookingId}: ${error}`);
      }
    }

    this.logger.log(`Booking ${bookingId} completed`);
  }
}

