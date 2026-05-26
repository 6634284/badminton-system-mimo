import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OutboxScanJob {
  private readonly logger = new Logger(OutboxScanJob.name);

  constructor(
    @InjectQueue('outbox-scan') private readonly outboxScanQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async triggerScan() {
    await this.outboxScanQueue.add('scan', {}, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: 10,
    });
  }
}
