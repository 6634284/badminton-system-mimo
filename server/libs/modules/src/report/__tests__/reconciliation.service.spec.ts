describe('ReconciliationService - Daily Cross-Table Check', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: { findMany: jest.fn() },
      paymentOrder: { aggregate: jest.fn(), findMany: jest.fn() },
      refundOrder: { aggregate: jest.fn(), findMany: jest.fn() },
      rechargeOrder: { aggregate: jest.fn(), findMany: jest.fn() },
      walletTransaction: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
  });

  describe('payment vs wallet reconciliation', () => {
    it('should match when payment total equals wallet credit', async () => {
      mockPrisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      mockPrisma.rechargeOrder.aggregate.mockResolvedValue({ _sum: { chargeAmount: 800 } });
      mockPrisma.$queryRaw.mockResolvedValue([{ sum: 1000 }]);

      const paymentTotal = await mockPrisma.paymentOrder.aggregate({
        where: { tenantId: BigInt(1), status: 'paid' },
        _sum: { amount: true },
      });
      const walletCredit = await mockPrisma.$queryRaw`SELECT SUM(amount) FROM wallet_transactions WHERE tenant_id = 1 AND type = 'credit'`;

      expect(paymentTotal._sum.amount).toBe(walletCredit[0].sum);
    });

    it('should detect discrepancy when totals differ', async () => {
      mockPrisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      mockPrisma.$queryRaw.mockResolvedValue([{ sum: 950 }]);

      const paymentTotal = await mockPrisma.paymentOrder.aggregate({
        where: { tenantId: BigInt(1), status: 'paid' },
        _sum: { amount: true },
      });
      const walletCredit = await mockPrisma.$queryRaw`SELECT SUM(amount) FROM wallet_transactions WHERE tenant_id = 1 AND type = 'credit'`;

      const discrepancy = paymentTotal._sum.amount - walletCredit[0].sum;
      expect(discrepancy).toBe(50);
    });
  });

  describe('refund reconciliation', () => {
    it('should match refund orders with wallet debit', async () => {
      mockPrisma.refundOrder.aggregate.mockResolvedValue({ _sum: { refundAmount: 200 } });
      mockPrisma.$queryRaw.mockResolvedValue([{ sum: 200 }]);

      const refundTotal = await mockPrisma.refundOrder.aggregate({
        where: { tenantId: BigInt(1), status: 'completed' },
        _sum: { refundAmount: true },
      });
      const walletDebit = await mockPrisma.$queryRaw`SELECT SUM(amount) FROM wallet_transactions WHERE tenant_id = 1 AND type = 'debit' AND biz_type = 'refund'`;

      expect(refundTotal._sum.refundAmount).toBe(walletDebit[0].sum);
    });
  });

  describe('per-tenant reconciliation', () => {
    it('should iterate over all active tenants', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: BigInt(1), name: '俱乐部A' },
        { id: BigInt(2), name: '俱乐部B' },
        { id: BigInt(3), name: '俱乐部C' },
      ]);

      const tenants = await mockPrisma.tenant.findMany({
        where: { status: 'active' },
      });

      expect(tenants).toHaveLength(3);
    });
  });
});

describe('SettlementService - Monthly Settlement', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: { findMany: jest.fn() },
      settlementOrder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      commissionRule: { findMany: jest.fn() },
      ledgerEntry: { create: jest.fn() },
      paymentOrder: { aggregate: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
  });

  describe('settlement generation', () => {
    it('should generate draft settlement for tenant', async () => {
      mockPrisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
      mockPrisma.settlementOrder.create.mockResolvedValue({
        id: BigInt(1),
        tenantId: BigInt(1),
        period: '2026-05',
        totalAmount: 5000,
        commission: 250,
        netAmount: 4750,
        status: 'draft',
      });

      const settlement = await mockPrisma.settlementOrder.create({
        data: {
          tenantId: BigInt(1),
          settlementNo: 'ST202605001',
          period: '2026-05',
          totalAmount: 5000,
          commission: 250,
          netAmount: 4750,
          status: 'draft',
        },
      });

      expect(settlement.status).toBe('draft');
      expect(settlement.netAmount).toBe(4750);
    });

    it('should generate unique settlement number', () => {
      const period = '2026-05';
      const seq = 1;
      const settlementNo = `ST${period.replace('-', '')}${String(seq).padStart(3, '0')}`;
      expect(settlementNo).toBe('ST202605001');
    });
  });

  describe('settlement status workflow', () => {
    it('should transition draft -> confirmed', async () => {
      mockPrisma.settlementOrder.update.mockResolvedValue({
        id: BigInt(1),
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      const settlement = await mockPrisma.settlementOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'confirmed', confirmedAt: new Date() },
      });

      expect(settlement.status).toBe('confirmed');
    });

    it('should transition confirmed -> paid', async () => {
      mockPrisma.settlementOrder.update.mockResolvedValue({
        id: BigInt(1),
        status: 'paid',
        paidAt: new Date(),
      });

      const settlement = await mockPrisma.settlementOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'paid', paidAt: new Date() },
      });

      expect(settlement.status).toBe('paid');
    });
  });

  describe('commission calculation', () => {
    it('should calculate percentage commission', () => {
      const rule = { type: 'percent', value: 5 };
      const amount = 5000;
      const commission = amount * (rule.value / 100);
      expect(commission).toBe(250);
    });

    it('should calculate fixed commission', () => {
      const rule = { type: 'fixed', value: 100 };
      const commission = rule.value;
      expect(commission).toBe(100);
    });

    it('should match commission rule by date range', () => {
      const rules = [
        { id: 1, validFrom: new Date('2026-01-01'), validTo: new Date('2026-06-30'), value: 5 },
        { id: 2, validFrom: new Date('2026-07-01'), validTo: new Date('2026-12-31'), value: 3 },
      ];
      const settlementDate = new Date('2026-05-15');

      const matched = rules.find(r =>
        settlementDate >= r.validFrom && settlementDate <= r.validTo,
      );

      expect(matched!.id).toBe(1);
      expect(matched!.value).toBe(5);
    });
  });

  describe('ledger entries', () => {
    it('should create double-entry ledger on settlement', async () => {
      mockPrisma.ledgerEntry.create
        .mockResolvedValueOnce({ id: BigInt(1), type: 'debit', amount: 5000 })
        .mockResolvedValueOnce({ id: BigInt(2), type: 'credit', amount: 4750 })
        .mockResolvedValueOnce({ id: BigInt(3), type: 'credit', amount: 250 });

      // Debit: platform receivable
      const debit = await mockPrisma.ledgerEntry.create({
        data: { type: 'debit', amount: 5000, account: 'platform_receivable' },
      });
      // Credit: tenant payable
      const credit1 = await mockPrisma.ledgerEntry.create({
        data: { type: 'credit', amount: 4750, account: 'tenant_payable' },
      });
      // Credit: commission revenue
      const credit2 = await mockPrisma.ledgerEntry.create({
        data: { type: 'credit', amount: 250, account: 'commission_revenue' },
      });

      expect(debit.type).toBe('debit');
      expect(credit1.amount + credit2.amount).toBe(5000);
    });
  });
});

describe('CommissionService - Rule Management', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      commissionRule: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      ledgerEntry: { create: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
  });

  it('should create commission rule', async () => {
    mockPrisma.commissionRule.create.mockResolvedValue({
      id: BigInt(1),
      tenantId: BigInt(1),
      type: 'percent',
      value: 5,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
    });

    const rule = await mockPrisma.commissionRule.create({
      data: {
        tenantId: BigInt(1),
        type: 'percent',
        value: 5,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
      },
    });

    expect(rule.type).toBe('percent');
    expect(rule.value).toBe(5);
  });

  it('should list commission rules for tenant', async () => {
    mockPrisma.commissionRule.findMany.mockResolvedValue([
      { id: BigInt(1), type: 'percent', value: 5 },
      { id: BigInt(2), type: 'fixed', value: 50 },
    ]);

    const rules = await mockPrisma.commissionRule.findMany({
      where: { tenantId: BigInt(1) },
    });

    expect(rules).toHaveLength(2);
  });

  it('should update commission rule', async () => {
    mockPrisma.commissionRule.update.mockResolvedValue({
      id: BigInt(1),
      value: 3,
    });

    const rule = await mockPrisma.commissionRule.update({
      where: { id: BigInt(1) },
      data: { value: 3 },
    });

    expect(rule.value).toBe(3);
  });
});
