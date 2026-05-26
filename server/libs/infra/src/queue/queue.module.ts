import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port, 10) || 6379,
        password: redisUrl.password || undefined,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
