import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { SeatGateway } from './seat.gateway';
import { WsAuthService } from './ws-auth.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [SeatGateway, WsAuthService],
})
export class WsGatewayModule {}
