import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { QueueModule } from '@app/infra/queue';
import { ActivityStatusJob } from './jobs/activity-status.job';
import { OutboxScanJob } from './jobs/outbox-scan.job';
import { ScheduleGenJob } from './jobs/schedule-gen.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    QueueModule,
    BullModule.registerQueue(
      { name: 'outbox-scan' },
    ),
  ],
  providers: [ActivityStatusJob, OutboxScanJob, ScheduleGenJob],
})
export class SchedulerModule {}
