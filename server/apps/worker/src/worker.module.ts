import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { QueueModule } from '@app/infra/queue';
import { OutboxRelayProcessor } from './outbox-relay.processor';
import { OutboxScanProcessor } from './outbox-scan.processor';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    QueueModule,
    BullModule.registerQueue(
      { name: 'outbox-relay' },
      { name: 'outbox-scan' },
    ),
  ],
  providers: [OutboxRelayProcessor, OutboxScanProcessor],
})
export class WorkerModule {}
