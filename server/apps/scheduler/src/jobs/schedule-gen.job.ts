import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class ScheduleGenJob {
  private readonly logger = new Logger(ScheduleGenJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // Daily at 02:00: generate court schedules for the next 14 days
  @Cron('0 2 * * *')
  async generateSchedules() {
    this.logger.log('Starting daily schedule generation...');

    const venues = await this.prisma.venue.findMany({
      where: { status: 'active', deletedAt: null },
    });

    let totalCreated = 0;

    for (const venue of venues) {
      const courts = await this.prisma.court.findMany({
        where: { venueId: venue.id, status: 'active', deletedAt: null },
      });

      if (courts.length === 0) continue;

      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 13); // 14th day

      for (const court of courts) {
        for (let h = 8; h < 22; h++) {
          const startTime = new Date(targetDate);
          startTime.setHours(h, 0, 0, 0);

          const endTime = new Date(startTime);
          endTime.setHours(h + 1);

          try {
            await this.prisma.courtSchedule.create({
              data: {
                tenantId: venue.tenantId,
                venueId: venue.id,
                courtId: court.id,
                playDate: targetDate,
                startTime,
                endTime,
                price: court.basePrice,
                status: 'available',
                version: 0,
              },
            });
            totalCreated++;
          } catch (e: any) {
            if (e.code !== 'P2002') {
              this.logger.error(`Schedule gen error for court ${court.id}: ${e.message}`);
            }
          }
        }
      }
    }

    this.logger.log(`Schedule generation complete: ${totalCreated} slots created`);
  }
}
