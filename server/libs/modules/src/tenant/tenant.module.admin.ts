import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantContextService } from './tenant-context.service';
import { TenantAdminController } from './tenant.controller.admin';
import { StaffAdminController } from './staff.controller.admin';
import { SettingsAdminController } from './settings.controller.admin';
import { AuditLogAdminController } from './audit.controller.admin';

@Module({
  providers: [TenantService, TenantContextService],
  controllers: [TenantAdminController, StaffAdminController, SettingsAdminController, AuditLogAdminController],
  exports: [TenantService, TenantContextService],
})
export class TenantAdminModule {}
