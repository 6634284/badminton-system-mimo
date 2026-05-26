import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [],
  providers: [],
})
export class OpenApiModule {}
