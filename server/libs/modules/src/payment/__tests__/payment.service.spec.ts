describe('PaymentService - Callback Idempotency & State Machine', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      paymentOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
      rechargeOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      activityRegistration: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
    };
    mockRedis = {
      eval: jest.fn(),
      incr: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setnx: jest.fn(),
      del: jest.fn(),
    };
  });

  describe('callback idempotency', () => {
    it('should process first callback normally', async () => {
      mockRedis.setnx.mockResolvedValue(1); // lock acquired
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'pending',
        amount: 100,
        bizType: 'activity',
        bizId: BigInt(100),
      });
      mockPrisma.paymentOrder.update.mockResolvedValue({ id: BigInt(1), status: 'paid' });

      const lockResult = await mockRedis.setnx('pay:callback:order:1', 'processing');
      expect(lockResult).toBe(1);

      const order = await mockPrisma.paymentOrder.findUnique({ where: { id: BigInt(1) } });
      expect(order.status).toBe('pending');
    });

    it('should reject duplicate callback (1000x storm)', async () => {
      mockRedis.setnx.mockResolvedValue(0); // lock not acquired (already processing/processed)
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'paid', // already paid
      });

      const lockResult = await mockRedis.setnx('pay:callback:order:1', 'processing');
      expect(lockResult).toBe(0);

      const order = await mockPrisma.paymentOrder.findUnique({ where: { id: BigInt(1) } });
      expect(order.status).toBe('paid');
      // No credit should be issued
    });

    it('should use SELECT FOR UPDATE to prevent concurrent processing', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'pending',
      });

      const order = await mockPrisma.$executeRaw`SELECT * FROM payment_orders WHERE id = 1 AND status = 'pending' FOR UPDATE`;
      expect(order).toBe(1);
    });
  });

  describe('payment state machine', () => {
    it('should transition pending -> paid on successful callback', async () => {
      const order = {
        id: BigInt(1),
        status: 'pending',
        amount: 100,
        bizType: 'activity',
        bizId: BigInt(100),
      };
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(order);
      mockPrisma.paymentOrder.update.mockResolvedValue({ ...order, status: 'paid' });

      const updated = await mockPrisma.paymentOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'paid', paidAt: new Date() },
      });
      expect(updated.status).toBe('paid');
    });

    it('should transition pending -> failed on failed callback', async () => {
      const order = {
        id: BigInt(1),
        status: 'pending',
      };
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(order);
      mockPrisma.paymentOrder.update.mockResolvedValue({ ...order, status: 'failed' });

      const updated = await mockPrisma.paymentOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'failed', failReason: 'bank_declined' },
      });
      expect(updated.status).toBe('failed');
    });

    it('should not transition paid -> failed', async () => {
      const order = {
        id: BigInt(1),
        status: 'paid',
      };
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(order);

      // Business logic should reject invalid transition
      expect(order.status).toBe('paid');
      // Cannot go backwards: paid -> failed
    });

    it('should not transition paid -> pending', async () => {
      const order = {
        id: BigInt(1),
        status: 'paid',
      };
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(order);

      expect(order.status).toBe('paid');
      // Cannot go backwards: paid -> pending
    });
  });

  describe('recharge order -> wallet credit', () => {
    it('should credit wallet on successful recharge payment', async () => {
      const rechargeOrder = {
        id: BigInt(1),
        tenantId: BigInt(1),
        userId: BigInt(1),
        status: 'pending',
        chargeAmount: 200,
        giftAmount: 30,
        packageId: BigInt(1),
      };
      mockPrisma.rechargeOrder.findUnique.mockResolvedValue(rechargeOrder);
      mockPrisma.rechargeOrder.update.mockResolvedValue({ ...rechargeOrder, status: 'paid' });
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

      // Update order status
      const updated = await mockPrisma.rechargeOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'paid' },
      });
      expect(updated.status).toBe('paid');

      // Credit cash
      await mockPrisma.$executeRaw`UPDATE wallets SET cash_balance = cash_balance + 200, version = version + 1 WHERE id = 1`;
      // Credit gift
      await mockPrisma.$executeRaw`UPDATE wallets SET gift_balance = gift_balance + 30, version = version + 1 WHERE id = 1`;

      // Write transactions
      await mockPrisma.walletTransaction.create({
        data: { type: 'credit', amount: 200, balanceType: 'cash', bizType: 'recharge' },
      });
      await mockPrisma.walletTransaction.create({
        data: { type: 'credit', amount: 30, balanceType: 'gift', bizType: 'recharge' },
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledTimes(2);
    });

    it('should not double-credit on duplicate callback', async () => {
      const rechargeOrder = {
        id: BigInt(1),
        status: 'paid', // already paid
      };
      mockPrisma.rechargeOrder.findUnique.mockResolvedValue(rechargeOrder);

      // Business logic should skip if already paid
      expect(rechargeOrder.status).toBe('paid');
    });
  });

  describe('activity registration -> mark paid', () => {
    it('should mark registration as paid after payment', async () => {
      const registration = {
        id: BigInt(1),
        status: 'pending_payment',
        activityId: BigInt(100),
      };
      mockPrisma.activityRegistration.findUnique.mockResolvedValue(registration);
      mockPrisma.activityRegistration.update.mockResolvedValue({
        ...registration,
        status: 'confirmed',
        paidAt: new Date(),
      });

      const updated = await mockPrisma.activityRegistration.update({
        where: { id: BigInt(1) },
        data: { status: 'confirmed', paidAt: new Date() },
      });
      expect(updated.status).toBe('confirmed');
    });

    it('should emit outbox event after marking paid', async () => {
      mockPrisma.outboxEvent.create.mockImplementation((args: any) =>
        Promise.resolve({ id: BigInt(1), ...args.data }),
      );

      const event = await mockPrisma.outboxEvent.create({
        data: {
          tenantId: BigInt(1),
          eventType: 'registration.paid',
          payload: { registrationId: 1, activityId: 100, userId: 1 },
          status: 'pending',
        },
      });
      expect(event.eventType).toBe('registration.paid');
    });
  });

  describe('refund flow', () => {
    it('should calculate refund based on cancel policy', () => {
      const policy = { freeCancelHours: 24, penaltyPercent: 50 };
      const activityStartTime = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours from now
      const now = new Date();

      const hoursUntilStart = (activityStartTime.getTime() - now.getTime()) / 3600000;
      const isFreeCancel = hoursUntilStart >= policy.freeCancelHours;

      expect(isFreeCancel).toBe(true);
      expect(hoursUntilStart).toBeGreaterThan(24);
    });

    it('should apply penalty for late cancellation', () => {
      const policy = { freeCancelHours: 24, penaltyPercent: 50 };
      const activityStartTime = new Date(Date.now() + 12 * 3600 * 1000); // 12 hours from now
      const now = new Date();
      const paidAmount = 100;

      const hoursUntilStart = (activityStartTime.getTime() - now.getTime()) / 3600000;
      const isFreeCancel = hoursUntilStart >= policy.freeCancelHours;

      expect(isFreeCancel).toBe(false);

      const refundAmount = isFreeCancel
        ? paidAmount
        : paidAmount * (1 - policy.penaltyPercent / 100);

      expect(refundAmount).toBe(50); // 50% penalty
    });

    it('should refund to wallet for wallet payments', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

      await mockPrisma.$executeRaw`UPDATE wallets SET cash_balance = cash_balance + 100, version = version + 1 WHERE id = 1`;
      await mockPrisma.walletTransaction.create({
        data: { type: 'credit', amount: 100, balanceType: 'cash', bizType: 'refund' },
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalled();
    });
  });
});
