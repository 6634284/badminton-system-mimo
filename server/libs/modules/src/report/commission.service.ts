import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listRules(tenantId: bigint) {
    return this.prisma.commissionRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(tenantId: bigint, dto: { bizType: string; ruleType: string; ruleValue: number; effectiveFrom: string }) {
    return this.prisma.commissionRule.create({
      data: {
        tenantId,
        bizType: dto.bizType,
        ruleType: dto.ruleType,
        ruleValue: dto.ruleValue,
        effectiveFrom: new Date(dto.effectiveFrom),
        status: 'active',
      },
    });
  }

  async updateRule(id: bigint, dto: { ruleType?: string; ruleValue?: number; status?: string }) {
    return this.prisma.commissionRule.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Calculate commission for a given tenant and biz type
   */
  async calculate(tenantId: bigint, bizType: string, amount: number): Promise<number> {
    const rule = await this.prisma.commissionRule.findFirst({
      where: {
        tenantId,
        bizType,
        status: 'active',
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!rule) return 0;

    if (rule.ruleType === 'percent') {
      return amount * Number(rule.ruleValue) / 100;
    } else if (rule.ruleType === 'fixed') {
      return Number(rule.ruleValue);
    }

    return 0;
  }

  /**
   * Write a ledger entry (double-entry bookkeeping)
   */
  async writeLedgerEntry(tenantId: bigint, accountCode: string, direction: 'D' | 'C', amount: number, sourceType: string, sourceId: bigint) {
    return this.prisma.ledgerEntry.create({
      data: {
        tenantId,
        accountCode,
        direction,
        amount,
        sourceType,
        sourceId,
        occurredAt: new Date(),
      },
    });
  }
}
