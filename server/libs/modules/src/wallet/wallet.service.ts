import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { WalletQueryDto, TransactionQueryDto } from './dto';

const MAX_RETRY = 3;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(tenantId: bigint, userId: bigint) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          tenantId,
          userId,
          cashBalance: 0,
          giftBalance: 0,
          frozenBalance: 0,
          version: 0,
        },
      });
    }

    return this.formatWallet(wallet);
  }

  async debit(
    tenantId: bigint,
    userId: bigint,
    amount: number,
    bizType: string,
    sourceType: string,
    sourceId: bigint,
    remark?: string,
  ): Promise<boolean> {
    if (amount <= 0) throw new BadRequestException('扣款金额必须大于0');

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      });

      if (!wallet) throw new NotFoundException('钱包不存在');

      const totalBalance = Number(wallet.cashBalance) + Number(wallet.giftBalance);
      if (totalBalance < amount) {
        throw new BadRequestException('余额不足');
      }

      // Gift-first deduction strategy
      let remaining = amount;
      let giftDebit = 0;
      let cashDebit = 0;

      if (Number(wallet.giftBalance) >= remaining) {
        giftDebit = remaining;
        remaining = 0;
      } else {
        giftDebit = Number(wallet.giftBalance);
        remaining -= giftDebit;
      }
      cashDebit = remaining;

      try {
        await this.prisma.$transaction(async (tx) => {
          // Optimistic locking update
          const result = await tx.$executeRaw`
            UPDATE wallets
            SET cash_balance = cash_balance - ${cashDebit},
                gift_balance = gift_balance - ${giftDebit},
                version = version + 1,
                updated_at = NOW()
            WHERE id = ${wallet.id}
              AND version = ${wallet.version}
              AND cash_balance + gift_balance >= ${amount}
          `;

          if (result === 0) {
            throw new Error('OPTIMISTIC_LOCK_RETRY');
          }

          // Write transaction log
          if (giftDebit > 0) {
            await tx.walletTransaction.create({
              data: {
                tenantId,
                walletId: wallet.id,
                userId,
                direction: 'D',
                amount: giftDebit,
                subAccount: 'gift',
                bizType,
                sourceType,
                sourceId,
                remark: remark || '余额扣款(赠送)',
              },
            });
          }

          if (cashDebit > 0) {
            await tx.walletTransaction.create({
              data: {
                tenantId,
                walletId: wallet.id,
                userId,
                direction: 'D',
                amount: cashDebit,
                subAccount: 'cash',
                bizType,
                sourceType,
                sourceId,
                remark: remark || '余额扣款(现金)',
              },
            });
          }
        });

        this.logger.log(`Wallet debit: user=${userId}, amount=${amount}, biz=${bizType}`);
        return true;
      } catch (e: any) {
        if (e.message === 'OPTIMISTIC_LOCK_RETRY') {
          this.logger.warn(`Wallet debit optimistic retry ${attempt + 1}/${MAX_RETRY}`);
          continue;
        }
        throw e;
      }
    }

    throw new BadRequestException('扣款失败，请重试');
  }

  async credit(
    tenantId: bigint,
    userId: bigint,
    amount: number,
    subAccount: 'cash' | 'gift',
    bizType: string,
    sourceType: string,
    sourceId: bigint,
    remark?: string,
  ): Promise<boolean> {
    if (amount <= 0) throw new BadRequestException('入账金额必须大于0');

    const wallet = await this.prisma.wallet.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!wallet) throw new NotFoundException('钱包不存在');

    await this.prisma.$transaction(async (tx) => {
      const balanceField = subAccount === 'cash' ? 'cashBalance' : 'giftBalance';
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          [balanceField]: { increment: amount },
          version: { increment: 1 },
        },
      });

      await tx.walletTransaction.create({
        data: {
          tenantId,
          walletId: wallet.id,
          userId,
          direction: 'C',
          amount,
          subAccount,
          bizType,
          sourceType,
          sourceId,
          remark: remark || '入账',
        },
      });
    });

    this.logger.log(`Wallet credit: user=${userId}, amount=${amount}, sub=${subAccount}, biz=${bizType}`);
    return true;
  }

  async getBalance(tenantId: bigint, userId: bigint) {
    const wallet = await this.getOrCreateWallet(tenantId, userId);
    return {
      cash_balance: wallet.cash_balance,
      gift_balance: wallet.gift_balance,
      frozen_balance: wallet.frozen_balance,
      total: (Number(wallet.cash_balance) + Number(wallet.gift_balance)).toFixed(2),
    };
  }

  async getTransactions(tenantId: bigint, userId: bigint, query: TransactionQueryDto) {
    const where: any = { tenantId, userId };
    if (query.direction) where.direction = query.direction;
    if (query.bizType) where.bizType = query.bizType;

    const [txs, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      list: txs.map((t) => ({
        id: t.id.toString(),
        direction: t.direction,
        amount: t.amount.toString(),
        sub_account: t.subAccount,
        biz_type: t.bizType,
        source_type: t.sourceType,
        source_id: t.sourceId.toString(),
        remark: t.remark,
        occurred_at: t.occurredAt.toISOString(),
      })),
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  async listWallets(tenantId: bigint, query: WalletQueryDto) {
    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        where: { tenantId, deletedAt: null },
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wallet.count({ where: { tenantId, deletedAt: null } }),
    ]);

    return {
      list: wallets.map((w) => this.formatWallet(w)),
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  private formatWallet(w: any) {
    return {
      id: w.id.toString(),
      tenant_id: w.tenantId.toString(),
      user_id: w.userId.toString(),
      cash_balance: w.cashBalance.toString(),
      gift_balance: w.giftBalance.toString(),
      frozen_balance: w.frozenBalance.toString(),
      version: Number(w.version),
      created_at: w.createdAt.toISOString(),
    };
  }
}
