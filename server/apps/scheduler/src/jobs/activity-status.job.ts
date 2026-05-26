import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class ActivityStatusJob {
  private readonly logger = new Logger(ActivityStatusJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // Every 5 minutes: transition activity statuses
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStatusTransitions() {
    const now = new Date();

    // published -> registering (when register_open_at reached)
    const toRegistering = await this.prisma.activity.updateMany({
      where: {
        status: 'published',
        registerOpenAt: { lte: now },
        deletedAt: null,
      },
      data: { status: 'registering' },
    });

    // registering -> full (when join_count >= capacity)
    const fullActivities = await this.prisma.activity.findMany({
      where: {
        status: 'registering',
        deletedAt: null,
      },
    });

    let fullCount = 0;
    for (const a of fullActivities) {
      if (a.joinCount >= a.capacity) {
        await this.prisma.activity.update({
          where: { id: a.id },
          data: { status: 'full' },
        });
        fullCount++;
      }
    }

    // registering/full -> ongoing (when start_at reached)
    const toOngoing = await this.prisma.activity.updateMany({
      where: {
        status: { in: ['registering', 'full'] },
        startAt: { lte: now },
        deletedAt: null,
      },
      data: { status: 'ongoing' },
    });

    // ongoing -> finished (when end_at reached)
    const toFinished = await this.prisma.activity.updateMany({
      where: {
        status: 'ongoing',
        endAt: { lte: now },
        deletedAt: null,
      },
      data: { status: 'finished' },
    });

    const total = toRegistering.count + fullCount + toOngoing.count + toFinished.count;
    if (total > 0) {
      this.logger.log(`Activity status transitions: registering=${toRegistering.count}, full=${fullCount}, ongoing=${toOngoing.count}, finished=${toFinished.count}`);
    }
  }

  // Every minute: expire registrations that are in 'paying' status for too long
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredRegistrations() {
    const expireThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes

    const expired = await this.prisma.activityRegistration.findMany({
      where: {
        status: 'paying',
        createdAt: { lte: expireThreshold },
        deletedAt: null,
      },
    });

    for (const reg of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.activityRegistration.update({
          where: { id: reg.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });

        await tx.registrationParticipant.updateMany({
          where: { registrationId: reg.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });

        await tx.activity.update({
          where: { id: reg.activityId },
          data: { joinCount: { decrement: reg.totalSlots } },
        });
      });
    }

    if (expired.length > 0) {
      this.logger.log(`Expired ${expired.length} unpaid registrations`);
    }
  }
}
