import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AdminApiModule } from './admin-api.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AdminApiModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api/admin/v1');

  const config = new DocumentBuilder()
    .setTitle('Badminton Admin API')
    .setDescription('B-side admin API for club management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Admin API running on http://localhost:${port}/docs`);
}

bootstrap();
