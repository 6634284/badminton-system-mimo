import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantContextService } from './tenant-context.service';
import { TenantClientController } from './tenant.controller.client';

@Module({
  providers: [TenantService, TenantContextService],
  controllers: [TenantClientController],
  exports: [TenantService, TenantContextService],
})
export class TenantClientModule {}
