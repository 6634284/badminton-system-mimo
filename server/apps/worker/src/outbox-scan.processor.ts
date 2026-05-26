import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor('outbox-scan')
export class OutboxScanProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('outbox-relay') private readonly relayQueue: Queue,
  ) {
    super();
  }

  async process() {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: { in: ['pending'] },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    for (const event of events) {
      await this.relayQueue.add('process', { eventId: event.id.toString() }, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: 100,
      });

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'processing' },
      });
    }

    if (events.length > 0) {
      this.logger.log(`Dispatched ${events.length} outbox events to relay queue`);
    }
  }
}
