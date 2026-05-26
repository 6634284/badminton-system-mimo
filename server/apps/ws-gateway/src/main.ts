import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WsGatewayModule } from './ws-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WsGatewayModule,
    new FastifyAdapter(),
  );

  await app.listen(3003, '0.0.0.0');
  console.log(`WebSocket Gateway running on http://localhost:3003`);
}

bootstrap();
