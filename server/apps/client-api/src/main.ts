import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClientApiModule } from './client-api.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ClientApiModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api/client/v1');

  const config = new DocumentBuilder()
    .setTitle('Badminton Client API')
    .setDescription('C-side API for badminton club members')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header' }, 'tenant-id')
    .addApiKey({ type: 'apiKey', name: 'Idempotency-Key', in: 'header' }, 'idempotency-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Client API running on http://localhost:${port}/docs`);
}

bootstrap();
