import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';

@Injectable()
export class CourtBookingService {
  private readonly logger = new Logger(CourtBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * List available time slots for a court on a specific date
   */
  async getAvailableSlots(tenantId: bigint, courtId: bigint, date: string) {
    const playDate = new Date(date);
    const schedules = await this.prisma.courtSchedule.findMany({
      where: { tenantId, courtId, playDate, deletedAt: null },
      orderBy: { startTime: 'asc' },
    });

    const court = await this.prisma.court.findFirst({ where: { id: courtId, tenantId, deletedAt: null } });
    if (!court) throw new NotFoundException('场地不存在');

    return {
      court_id: courtId.toString(),
      court_code: court.code,
      date,
      slots: schedules.map((s) => ({
        id: s.id.toString(),
        start_time: s.startTime.toISOString().slice(11, 16),
        end_time: s.endTime.toISOString().slice(11, 16),
        price: s.price.toString(),
        status: s.status,
      })),
    };
  }

  /**
   * Book a court time slot for private session
   */
  async book(tenantId: bigint, userId: bigint, dto: { scheduleId: string; playerName?: string; phone?: string }) {
    const scheduleId = BigInt(dto.scheduleId);

    // Use Redis lock for concurrent booking protection
    const lockKey = `lock:court:book:${dto.scheduleId}`;
    const existing = await this.redis.get(lockKey);
    if (existing) throw new BadRequestException('请稍后重试');
    await this.redis.set(lockKey, '1', 10);

    try {
      const schedule = await this.prisma.courtSchedule.findUnique({ where: { id: scheduleId } });
      if (!schedule || schedule.tenantId !== tenantId) throw new NotFoundException('时段不存在');
      if (schedule.status !== 'available') throw new BadRequestException('该时段不可预约');

      // Update schedule status using optimistic locking
      const updated = await this.prisma.$executeRaw`
        UPDATE court_schedules
        SET status = 'booked', ref_type = 'private_booking', ref_id = ${userId}, version = version + 1, updated_at = NOW()
        WHERE id = ${scheduleId} AND status = 'available' AND version = ${schedule.version}
      `;

      if (updated === 0) throw new BadRequestException('该时段已被他人预约');

      // Create a booking record (using payment_order as booking reference)
      const bookingNo = `CB${Date.now()}`;
      const court = await this.prisma.court.findUnique({ where: { id: schedule.courtId } });

      this.logger.log(`Court booked: ${bookingNo} by user ${userId}`);
      return {
        booking_no: bookingNo,
        court_code: court?.code,
        date: schedule.playDate.toISOString().slice(0, 10),
        start_time: schedule.startTime.toISOString().slice(11, 16),
        end_time: schedule.endTime.toISOString().slice(11, 16),
        price: schedule.price.toString(),
        status: 'confirmed',
      };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Cancel a court booking
   */
  async cancel(tenantId: bigint, userId: bigint, scheduleId: bigint) {
    const schedule = await this.prisma.courtSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || schedule.tenantId !== tenantId) throw new NotFoundException('预约不存在');
    if (schedule.status !== 'booked') throw new BadRequestException('只能取消已预约的时段');
    if (schedule.refId !== userId) throw new BadRequestException('只能取消自己的预约');

    await this.prisma.courtSchedule.update({
      where: { id: scheduleId },
      data: { status: 'available', refType: null, refId: null },
    });

    this.logger.log(`Court booking cancelled: ${scheduleId}`);
    return { success: true };
  }

  /**
   * Get user's court bookings
   */
  async getMyBookings(tenantId: bigint, userId: bigint) {
    const bookings = await this.prisma.courtSchedule.findMany({
      where: { tenantId, refType: 'private_booking', refId: userId, deletedAt: null },
      orderBy: [{ playDate: 'asc' }, { startTime: 'asc' }],
    });

    const courtIds = [...new Set(bookings.map((b) => b.courtId))];
    const courts = await this.prisma.court.findMany({ where: { id: { in: courtIds } } });
    const courtMap = new Map(courts.map((c) => [c.id.toString(), c]));

    return bookings.map((b) => {
      const court = courtMap.get(b.courtId.toString());
      return {
        id: b.id.toString(),
        court_code: court?.code,
        date: b.playDate.toISOString().slice(0, 10),
        start_time: b.startTime.toISOString().slice(11, 16),
        end_time: b.endTime.toISOString().slice(11, 16),
        price: b.price.toString(),
        status: b.status,
      };
    });
  }
}
