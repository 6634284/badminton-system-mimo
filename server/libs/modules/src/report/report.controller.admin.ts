import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { SettlementService } from './settlement.service';
import { CommissionService } from './commission.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('财务报表')
@ApiBearerAuth()
@Controller('')
export class ReportAdminController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly settlementService: SettlementService,
    private readonly commissionService: CommissionService,
  ) {}

  // Reconciliation
  @Get('reconciliation')
  @RequirePermissions('report:reconciliation')
  @ApiOperation({ summary: '每日对账' })
  async dailyReconciliation(@Query('date') date: string) {
    const d = date ? new Date(date) : new Date();
    d.setDate(d.getDate() - 1); // Default to yesterday
    return this.reconciliationService.dailyReconciliation(d);
  }

  // Settlements
  @Get('settlements')
  @RequirePermissions('report:settlement')
  @ApiOperation({ summary: '结算单列表' })
  async listSettlements(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.settlementService.list(ctx.tenantId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Post('settlements/generate')
  @RequirePermissions('report:settlement')
  @ApiOperation({ summary: '生成月度结算' })
  async generateSettlement(@Body('year') year: number, @Body('month') month: number) {
    return this.settlementService.generateMonthlySettlement(year, month);
  }

  @Patch('settlements/:id/confirm')
  @RequirePermissions('report:settlement')
  @ApiOperation({ summary: '确认结算单' })
  async confirmSettlement(@Param('id') id: string) {
    return this.settlementService.confirm(BigInt(id));
  }

  @Patch('settlements/:id/pay')
  @RequirePermissions('report:settlement')
  @ApiOperation({ summary: '标记已支付' })
  async markPaid(@Param('id') id: string) {
    return this.settlementService.markPaid(BigInt(id));
  }

  // Commission rules
  @Get('commissions')
  @RequirePermissions('report:commission')
  @ApiOperation({ summary: '佣金规则列表' })
  async listCommissions(@Ctx() ctx: RequestContext) {
    return this.commissionService.listRules(ctx.tenantId);
  }

  @Post('commissions')
  @RequirePermissions('report:commission')
  @ApiOperation({ summary: '创建佣金规则' })
  async createCommission(
    @Body() dto: { bizType: string; ruleType: string; ruleValue: number; effectiveFrom: string },
    @Ctx() ctx: RequestContext,
  ) {
    return this.commissionService.createRule(ctx.tenantId, dto);
  }

  @Patch('commissions/:id')
  @RequirePermissions('report:commission')
  @ApiOperation({ summary: '更新佣金规则' })
  async updateCommission(@Param('id') id: string, @Body() dto: { ruleType?: string; ruleValue?: number; status?: string }) {
    return this.commissionService.updateRule(BigInt(id), dto);
  }
}
