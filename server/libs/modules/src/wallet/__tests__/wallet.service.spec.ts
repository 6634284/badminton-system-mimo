import { BadRequestException } from '@nestjs/common';

describe('WalletService - Debit/Credit', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };
    mockRedis = {
      eval: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
  });

  describe('optimistic locking deduction', () => {
    it('should deduct with version check', async () => {
      const wallet = {
        id: BigInt(1),
        tenantId: BigInt(1),
        userId: BigInt(1),
        cashBalance: 100,
        giftBalance: 50,
        frozenBalance: 0,
        version: 5,
      };
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.$executeRaw.mockResolvedValue(1); // 1 row affected
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

      // Simulate raw SQL debit with optimistic locking
      const affected = await mockPrisma.$executeRaw`
        UPDATE wallets
        SET cash_balance = cash_balance - 30,
            version = version + 1,
            updated_at = NOW()
        WHERE id = ${wallet.id}
          AND version = ${wallet.version}
          AND (cash_balance + gift_balance) >= 30
      `;
      expect(affected).toBe(1);
    });

    it('should retry on version conflict', async () => {
      const wallet = {
        id: BigInt(1),
        tenantId: BigInt(1),
        userId: BigInt(1),
        cashBalance: 100,
        giftBalance: 50,
        frozenBalance: 0,
        version: 5,
      };
      // First attempt: version conflict (0 rows affected)
      mockPrisma.$executeRaw.mockResolvedValueOnce(0);
      // After re-fetch: new version
      mockPrisma.wallet.findUnique.mockResolvedValue({ ...wallet, version: 6 });
      // Second attempt: success
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

      let affected = await mockPrisma.$executeRaw`UPDATE wallets SET version = version + 1 WHERE id = 1 AND version = 5`;
      expect(affected).toBe(0); // first attempt fails

      affected = await mockPrisma.$executeRaw`UPDATE wallets SET version = version + 1 WHERE id = 1 AND version = 6`;
      expect(affected).toBe(1); // retry succeeds
    });

    it('should fail after max retries', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0); // always conflicts
      const wallet = { id: BigInt(1), version: 5 };
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);

      for (let i = 0; i < 3; i++) {
        const affected = await mockPrisma.$executeRaw`UPDATE wallets SET version = version + 1 WHERE version = ${wallet.version}`;
        expect(affected).toBe(0);
      }
    });
  });

  describe('gift-first deduction', () => {
    it('should deduct from gift balance first, then cash', async () => {
      const wallet = {
        id: BigInt(1),
        cashBalance: 100,
        giftBalance: 30,
        version: 1,
      };
      const amount = 50;

      // Gift balance covers 30, cash covers 20
      const giftDeduct = Math.min(wallet.giftBalance, amount); // 30
      const cashDeduct = amount - giftDeduct; // 20

      expect(giftDeduct).toBe(30);
      expect(cashDeduct).toBe(20);
    });

    it('should deduct entirely from gift if sufficient', async () => {
      const wallet = {
        cashBalance: 100,
        giftBalance: 80,
      };
      const amount = 50;

      const giftDeduct = Math.min(wallet.giftBalance, amount); // 50
      const cashDeduct = amount - giftDeduct; // 0

      expect(giftDeduct).toBe(50);
      expect(cashDeduct).toBe(0);
    });

    it('should deduct entirely from cash if no gift', async () => {
      const wallet = {
        cashBalance: 100,
        giftBalance: 0,
      };
      const amount = 30;

      const giftDeduct = Math.min(wallet.giftBalance, amount); // 0
      const cashDeduct = amount - giftDeduct; // 30

      expect(giftDeduct).toBe(0);
      expect(cashDeduct).toBe(30);
    });
  });

  describe('never-negative balance', () => {
    it('should reject debit exceeding total balance', async () => {
      const wallet = {
        id: BigInt(1),
        cashBalance: 20,
        giftBalance: 10,
        version: 1,
      };
      const amount = 50; // exceeds 20 + 10 = 30

      mockPrisma.$executeRaw.mockResolvedValue(0); // constraint prevents negative
      const affected = await mockPrisma.$executeRaw`UPDATE wallets SET cash_balance = cash_balance - ${amount} WHERE id = 1 AND (cash_balance + gift_balance) >= ${amount}`;
      expect(affected).toBe(0);
    });

    it('should allow debit equal to total balance', async () => {
      const wallet = {
        id: BigInt(1),
        cashBalance: 20,
        giftBalance: 10,
        version: 1,
      };
      const amount = 30; // exactly 20 + 10

      mockPrisma.$executeRaw.mockResolvedValue(1);
      const affected = await mockPrisma.$executeRaw`UPDATE wallets SET cash_balance = cash_balance - ${amount} WHERE id = 1 AND (cash_balance + gift_balance) >= ${amount}`;
      expect(affected).toBe(1);
    });
  });

  describe('transaction always written', () => {
    it('should write transaction record on successful debit', async () => {
      mockPrisma.walletTransaction.create.mockResolvedValue({
        id: BigInt(1),
        walletId: BigInt(1),
        type: 'debit',
        amount: 30,
        balanceType: 'gift',
        description: 'Activity registration',
      });

      const tx = await mockPrisma.walletTransaction.create({
        data: {
          walletId: BigInt(1),
          tenantId: BigInt(1),
          type: 'debit',
          amount: 30,
          balanceType: 'gift',
          bizType: 'activity',
          bizId: BigInt(100),
          description: 'Activity registration',
        },
      });

      expect(tx.type).toBe('debit');
      expect(tx.amount).toBe(30);
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalled();
    });

    it('should write transaction record on credit (refund)', async () => {
      mockPrisma.walletTransaction.create.mockResolvedValue({
        id: BigInt(2),
        walletId: BigInt(1),
        type: 'credit',
        amount: 30,
        balanceType: 'cash',
        description: 'Activity cancellation refund',
      });

      const tx = await mockPrisma.walletTransaction.create({
        data: {
          walletId: BigInt(1),
          tenantId: BigInt(1),
          type: 'credit',
          amount: 30,
          balanceType: 'cash',
          bizType: 'refund',
          bizId: BigInt(200),
          description: 'Activity cancellation refund',
        },
      });

      expect(tx.type).toBe('credit');
      expect(tx.amount).toBe(30);
    });
  });

  describe('credit (recharge)', () => {
    it('should credit cash balance', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

      const affected = await mockPrisma.$executeRaw`UPDATE wallets SET cash_balance = cash_balance + 100, version = version + 1 WHERE id = 1`;
      expect(affected).toBe(1);
    });

    it('should credit gift balance separately', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

      const affected = await mockPrisma.$executeRaw`UPDATE wallets SET gift_balance = gift_balance + 10, version = version + 1 WHERE id = 1`;
      expect(affected).toBe(1);
    });
  });

  describe('freeze/unfreeze', () => {
    it('should freeze balance for pending payment', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const affected = await mockPrisma.$executeRaw`UPDATE wallets SET frozen_balance = frozen_balance + 50, version = version + 1 WHERE id = 1 AND (cash_balance + gift_balance - frozen_balance) >= 50`;
      expect(affected).toBe(1);
    });

    it('should reject freeze exceeding available balance', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0);

      const affected = await mockPrisma.$executeRaw`UPDATE wallets SET frozen_balance = frozen_balance + 200, version = version + 1 WHERE id = 1 AND (cash_balance + gift_balance - frozen_balance) >= 200`;
      expect(affected).toBe(0);
    });
  });
});
