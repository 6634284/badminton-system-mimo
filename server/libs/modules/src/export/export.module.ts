import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportAdminController } from './export.controller.admin';

@Module({
  providers: [ExportService],
  controllers: [ExportAdminController],
  exports: [ExportService],
})
export class ExportModule {}
