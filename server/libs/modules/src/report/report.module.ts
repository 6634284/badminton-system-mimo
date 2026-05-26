import { Module } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { SettlementService } from './settlement.service';
import { CommissionService } from './commission.service';
import { ReportAdminController } from './report.controller.admin';
import { DashboardController } from './dashboard.controller';

@Module({
  providers: [ReconciliationService, SettlementService, CommissionService],
  controllers: [ReportAdminController, DashboardController],
  exports: [ReconciliationService, SettlementService, CommissionService],
})
export class ReportModule {}
