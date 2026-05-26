import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { Job } from 'bullmq';

@Processor('outbox-relay')
export class OutboxRelayProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxRelayProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { eventId } = job.data;

    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: BigInt(eventId) },
    });

    if (!event) {
      this.logger.warn(`Outbox event ${eventId} not found`);
      return;
    }

    if (event.status === 'sent') {
      return; // Already processed
    }

    try {
      await this.handleEvent(event);

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'sent' },
      });

      this.logger.log(`Outbox event ${eventId} processed: ${event.eventType}`);
    } catch (e: any) {
      const retryCount = event.retryCount + 1;
      const nextRetryAt = new Date(Date.now() + Math.min(60000 * Math.pow(2, retryCount), 3600000));

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: retryCount >= 5 ? 'failed' : 'pending',
          retryCount,
          nextRetryAt,
        },
      });

      this.logger.error(`Outbox event ${eventId} failed (retry ${retryCount}): ${e.message}`);
      throw e;
    }
  }

  private async handleEvent(event: any) {
    const payload = event.payloadJson as any;

    switch (event.eventType) {
      case 'registration.created':
        // Could trigger notification, update counters, etc.
        this.logger.log(`Handling registration.created for aggregate ${event.aggregateId}`);
        break;

      case 'registration.canceled':
        this.logger.log(`Handling registration.canceled for aggregate ${event.aggregateId}`);
        break;

      case 'payment.confirmed':
        this.logger.log(`Handling payment.confirmed for aggregate ${event.aggregateId}`);
        break;

      case 'refund.completed':
        this.logger.log(`Handling refund.completed for aggregate ${event.aggregateId}`);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }
}
