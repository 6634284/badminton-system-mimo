import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { OpenApiModule } from './open-api.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    OpenApiModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api/open/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Open API running on http://localhost:${port}`);
}

bootstrap();
