import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { GenerateScheduleDto, ScheduleQueryDto } from './dto';

@Injectable()
export class CourtScheduleService {
  private readonly logger = new Logger(CourtScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: bigint, dto: GenerateScheduleDto) {
    const days = dto.days || 14;
    const startHour = parseInt(dto.startTime?.split(':')[0] || '8', 10);
    const endHour = parseInt(dto.endTime?.split(':')[0] || '22', 10);
    const slotMinutes = dto.slotMinutes || 60;

    const courts = await this.prisma.court.findMany({
      where: { venueId: BigInt(dto.venueId), tenantId, status: 'active', deletedAt: null },
    });

    if (courts.length === 0) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;
    const today = new Date();

    for (let d = 0; d < days; d++) {
      const playDate = new Date(today);
      playDate.setDate(playDate.getDate() + d);
      playDate.setHours(0, 0, 0, 0);

      for (const court of courts) {
        for (let h = startHour; h < endHour; h++) {
          for (let m = 0; m < 60; m += slotMinutes) {
            const startTime = new Date(playDate);
            startTime.setHours(h, m, 0, 0);

            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + slotMinutes);

            try {
              await this.prisma.courtSchedule.create({
                data: {
                  tenantId,
                  venueId: BigInt(dto.venueId),
                  courtId: court.id,
                  playDate,
                  startTime,
                  endTime,
                  price: court.basePrice,
                  status: 'available',
                  version: 0,
                },
              });
              created++;
            } catch (e: any) {
              // Unique constraint violation = already exists, skip
              if (e.code === 'P2002') {
                skipped++;
              } else {
                throw e;
              }
            }
          }
        }
      }
    }

    this.logger.log(`Schedule generated: ${created} created, ${skipped} skipped for venue ${dto.venueId}`);
    return { created, skipped };
  }

  async findByDate(tenantId: bigint, query: ScheduleQueryDto) {
    const playDate = new Date(query.date);
    playDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(playDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const where: any = {
      tenantId,
      venueId: BigInt(query.venueId),
      playDate: { gte: playDate, lt: nextDate },
      deletedAt: null,
    };

    if (query.courtId) where.courtId = BigInt(query.courtId);

    const schedules = await this.prisma.courtSchedule.findMany({
      where,
      orderBy: [{ courtId: 'asc' }, { startTime: 'asc' }],
    });

    // Group by court
    const courtMap = new Map<string, any[]>();
    for (const s of schedules) {
      const key = s.courtId.toString();
      if (!courtMap.has(key)) courtMap.set(key, []);
      courtMap.get(key)!.push(this.formatSchedule(s));
    }

    return {
      date: query.date,
      courts: Array.from(courtMap.entries()).map(([courtId, slots]) => ({
        court_id: courtId,
        slots,
      })),
    };
  }

  async setMaintenance(tenantId: bigint, scheduleId: bigint) {
    const schedule = await this.prisma.courtSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.tenantId !== tenantId) {
      throw new Error('排期不存在');
    }

    const updated = await this.prisma.courtSchedule.update({
      where: { id: scheduleId },
      data: { status: 'maintenance' },
    });

    return this.formatSchedule(updated);
  }

  private formatSchedule(s: any) {
    return {
      id: s.id.toString(),
      court_id: s.courtId.toString(),
      play_date: s.playDate.toISOString().split('T')[0],
      start_time: s.startTime.toISOString().substring(11, 16),
      end_time: s.endTime.toISOString().substring(11, 16),
      price: s.price?.toString(),
      status: s.status,
      version: s.version,
    };
  }
}
