import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantContextService } from './tenant-context.service';
import { TenantAdminController } from './tenant.controller.admin';
import { TenantClientController } from './tenant.controller.client';
import { StaffAdminController } from './staff.controller.admin';
import { SettingsAdminController } from './settings.controller.admin';
import { AuditLogAdminController } from './audit.controller.admin';

@Module({
  providers: [TenantService, TenantContextService],
  controllers: [TenantAdminController, TenantClientController, StaffAdminController, SettingsAdminController, AuditLogAdminController],
  exports: [TenantService, TenantContextService],
})
export class TenantModule {}
