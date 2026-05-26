import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fs from 'fs';
import path from 'path';

// This script exports OpenAPI JSON files for each API app
// Run: ts-node scripts/export-openapi.ts

async function exportOpenAPI() {
  const outputDir = path.resolve(__dirname, '../openapi');

  // Dynamically import and bootstrap each app module
  const apps = [
    { name: 'client', module: '../apps/client-api/src/client-api.module', prefix: 'api/client/v1' },
    { name: 'admin', module: '../apps/admin-api/src/admin-api.module', prefix: 'api/admin/v1' },
  ];

  for (const app of apps) {
    try {
      const module = await import(app.module);
      const ModuleClass = Object.values(module)[0] as any;

      const appInstance = await NestFactory.create<NestFastifyApplication>(
        ModuleClass,
        new FastifyAdapter(),
        { logger: false },
      );

      appInstance.setGlobalPrefix(app.prefix);

      const config = new DocumentBuilder()
        .setTitle(`Badminton ${app.name} API`)
        .setVersion('1.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(appInstance, config);
      const outputPath = path.join(outputDir, `${app.name}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
      console.log(`Exported ${app.name} API to ${outputPath}`);

      await appInstance.close();
    } catch (error) {
      console.error(`Failed to export ${app.name} API:`, error);
    }
  }
}

exportOpenAPI();
