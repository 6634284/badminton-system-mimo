import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily reconciliation: compare wallet_transactions vs payment_orders vs recharge_orders
   * Run at 05:00 daily via scheduler
   */
  async dailyReconciliation(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null, status: 'active' },
      select: { id: true, name: true },
    });

    const results: any[] = [];

    for (const tenant of tenants) {
      const result = await this.reconcileTenant(tenant.id, start, end);
      results.push({ tenant_id: tenant.id.toString(), tenant_name: tenant.name, ...result });
    }

    return {
      date: start.toISOString().slice(0, 10),
      total_tenants: results.length,
      discrepancies: results.filter((r) => r.status !== 'ok'),
      results,
    };
  }

  private async reconcileTenant(tenantId: bigint, start: Date, end: Date) {
    // Payment orders total
    const paymentSum = await this.prisma.paymentOrder.aggregate({
      where: { tenantId, status: 'paid', paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    // Refund orders total
    const refundSum = await this.prisma.refundOrder.aggregate({
      where: { tenantId, status: 'success', refundedAt: { gte: start, lte: end } },
      _sum: { refundAmount: true },
    });

    // Wallet credit (recharge + refund in)
    const walletCredit = await this.prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM wallet_transactions
      WHERE tenant_id = ${tenantId}
        AND direction = 'in'
        AND created_at >= ${start}
        AND created_at <= ${end}
    `;

    // Wallet debit (activity payment out)
    const walletDebit = await this.prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM wallet_transactions
      WHERE tenant_id = ${tenantId}
        AND direction = 'out'
        AND created_at >= ${start}
        AND created_at <= ${end}
    `;

    // Recharge orders total
    const rechargeSum = await this.prisma.rechargeOrder.aggregate({
      where: { tenantId, payStatus: 'paid', paidAt: { gte: start, lte: end } },
      _sum: { chargeAmount: true },
    });

    const payment = Number(paymentSum._sum?.amount || 0);
    const refund = Number(refundSum._sum?.refundAmount || 0);
    const credit = Number(walletCredit[0]?.total || 0);
    const debit = Number(walletDebit[0]?.total || 0);
    const recharge = Number(rechargeSum._sum?.chargeAmount || 0);

    // Basic consistency checks
    const issues: string[] = [];

    // Net payment should roughly equal wallet activity
    const netPayment = payment - refund;
    const netWallet = credit - debit;
    const diff = Math.abs(netPayment - netWallet);

    if (diff > 1) {
      issues.push(`Payment net (${netPayment}) vs Wallet net (${netWallet}) diff=${diff}`);
    }

    return {
      payment,
      refund,
      recharge,
      wallet_credit: credit,
      wallet_debit: debit,
      net_payment: netPayment,
      net_wallet: netWallet,
      status: issues.length === 0 ? 'ok' : 'discrepancy',
      issues,
    };
  }
}
