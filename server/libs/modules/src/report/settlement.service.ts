import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { randomBytes } from 'crypto';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate monthly settlement draft for all tenants
   * Run on 1st of each month at 04:00
   */
  async generateMonthlySettlement(year: number, month: number) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null, status: 'active' },
    });

    const results: any[] = [];

    for (const tenant of tenants) {
      // Check if settlement already exists
      const existing = await this.prisma.settlementOrder.findFirst({
        where: { tenantId: tenant.id, periodStart, periodEnd },
      });
      if (existing) {
        results.push({ tenant_id: tenant.id.toString(), status: 'already_exists' });
        continue;
      }

      const settlement = await this.generateTenantSettlement(tenant.id, periodStart, periodEnd);
      results.push(settlement);
    }

    return { period: `${year}-${String(month).padStart(2, '0')}`, results };
  }

  private async generateTenantSettlement(tenantId: bigint, periodStart: Date, periodEnd: Date) {
    // Gross payment
    const paymentSum = await this.prisma.paymentOrder.aggregate({
      where: { tenantId, status: 'paid', paidAt: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
    });

    // Refund total
    const refundSum = await this.prisma.refundOrder.aggregate({
      where: { tenantId, status: 'success', refundedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { refundAmount: true },
    });

    // Commission rules
    const rules = await this.prisma.commissionRule.findMany({
      where: { tenantId, status: 'active', effectiveFrom: { lte: periodEnd }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }] },
    });

    const gross = Number(paymentSum._sum?.amount || 0);
    const refund = Number(refundSum._sum?.refundAmount || 0);
    const net = gross - refund;

    // Calculate commission (default 0 if no rules)
    let commission = 0;
    for (const rule of rules) {
      if (rule.ruleType === 'percent') {
        commission += net * Number(rule.ruleValue) / 100;
      } else if (rule.ruleType === 'fixed') {
        commission += Number(rule.ruleValue);
      }
    }

    const payable = net - commission;
    const settlementNo = `ST${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}${randomBytes(4).toString('hex')}`;

    const settlement = await this.prisma.settlementOrder.create({
      data: {
        tenantId,
        settlementNo,
        periodStart,
        periodEnd,
        grossAmount: gross,
        refundAmount: refund,
        commissionAmount: commission,
        payableAmount: payable,
        status: 'draft',
      },
    });

    this.logger.log(`Settlement created: ${settlementNo} for tenant ${tenantId}, payable=${payable}`);
    return {
      id: settlement.id.toString(),
      settlement_no: settlementNo,
      gross: gross,
      refund,
      commission,
      payable,
      status: 'draft',
    };
  }

  async list(tenantId: bigint, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.settlementOrder.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlementOrder.count({ where: { tenantId } }),
    ]);

    return {
      list: items.map((s) => ({
        id: s.id.toString(),
        settlement_no: s.settlementNo,
        period_start: s.periodStart.toISOString().slice(0, 10),
        period_end: s.periodEnd.toISOString().slice(0, 10),
        gross_amount: s.grossAmount.toString(),
        refund_amount: s.refundAmount.toString(),
        commission_amount: s.commissionAmount.toString(),
        payable_amount: s.payableAmount.toString(),
        status: s.status,
        paid_at: s.paidAt?.toISOString(),
        created_at: s.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async confirm(id: bigint) {
    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('结算单不存在');
    if (settlement.status !== 'draft') throw new Error('只能确认草稿状态的结算单');

    return this.prisma.settlementOrder.update({
      where: { id },
      data: { status: 'confirmed' },
    });
  }

  async markPaid(id: bigint) {
    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('结算单不存在');

    return this.prisma.settlementOrder.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    });
  }
}
