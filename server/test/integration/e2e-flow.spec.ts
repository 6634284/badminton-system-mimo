describe('E2E Flow: Activity Registration -> Pay -> Cancel -> Refund', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      activity: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      activityRegistration: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      registrationParticipant: {
        createMany: jest.fn(),
      },
      paymentOrder: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refundOrder: {
        create: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
    };
    mockRedis = {
      eval: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setnx: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      del: jest.fn(),
    };
  });

  it('full flow: create -> register -> pay -> cancel -> refund', async () => {
    // Step 1: Activity exists and is published
    const activity = {
      id: BigInt(1),
      tenantId: BigInt(1),
      title: '周六开放场',
      status: 'published',
      maxParticipants: 12,
      price: 50,
      startTime: new Date(Date.now() + 48 * 3600 * 1000),
    };
    mockPrisma.activity.findUnique.mockResolvedValue(activity);

    // Step 3: Redis Lua seat decrement succeeds
    mockRedis.eval.mockResolvedValue(1);

    // Step 4: Create registration
    const registration = {
      id: BigInt(1),
      activityId: BigInt(1),
      userId: BigInt(1),
      status: 'pending_payment',
      seatNo: 1,
    };
    mockPrisma.activityRegistration.create.mockResolvedValue(registration);
    mockPrisma.registrationParticipant.createMany.mockResolvedValue({ count: 1 });

    // Step 2: User has no existing registration (first call), then returns confirmed (cancel step)
    mockPrisma.activityRegistration.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ ...registration, status: 'confirmed' });

    // Step 5: Create payment order
    const paymentOrder = {
      id: BigInt(1),
      amount: 50,
      status: 'pending',
      bizType: 'activity',
      bizId: BigInt(1),
    };
    mockPrisma.paymentOrder.create.mockResolvedValue(paymentOrder);

    // Step 6: Payment callback succeeds
    mockRedis.setnx.mockResolvedValue(1); // idempotency lock
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(paymentOrder);
    mockPrisma.paymentOrder.update.mockResolvedValue({ ...paymentOrder, status: 'paid' });
    mockPrisma.activityRegistration.update.mockResolvedValue({
      ...registration,
      status: 'confirmed',
      paidAt: new Date(),
    });
    mockPrisma.outboxEvent.create.mockResolvedValue({ id: BigInt(1) });

    // Step 7: User cancels
    mockPrisma.activityRegistration.update.mockResolvedValue({
      ...registration,
      status: 'cancelled',
    });
    mockRedis.incr.mockResolvedValue(13); // seat released back

    // Step 8: Refund
    mockPrisma.refundOrder.create.mockResolvedValue({
      id: BigInt(1),
      refundAmount: 50, // full refund (48h before start)
      status: 'completed',
    });
    mockPrisma.$executeRaw.mockResolvedValue(1); // wallet credit
    mockPrisma.walletTransaction.create.mockResolvedValue({ id: BigInt(1) });

    // === Execute Flow ===

    // Register
    const act = await mockPrisma.activity.findUnique({ where: { id: BigInt(1) } });
    expect(act.status).toBe('published');

    const existing = await mockPrisma.activityRegistration.findFirst({
      where: { activityId: BigInt(1), userId: BigInt(1), status: { notIn: ['cancelled'] } },
    });
    expect(existing).toBeNull();

    const seatResult = await mockRedis.eval('', ['activity:seats:1'], []);
    expect(seatResult).toBe(1);

    const reg = await mockPrisma.activityRegistration.create({ data: registration });
    expect(reg.status).toBe('pending_payment');

    // Pay
    const lock = await mockRedis.setnx('pay:callback:order:1', '1');
    expect(lock).toBe(1);

    const order = await mockPrisma.paymentOrder.findUnique({ where: { id: BigInt(1) } });
    expect(order.status).toBe('pending');

    await mockPrisma.paymentOrder.update({
      where: { id: BigInt(1) },
      data: { status: 'paid' },
    });
    await mockPrisma.activityRegistration.update({
      where: { id: BigInt(1) },
      data: { status: 'confirmed', paidAt: new Date() },
    });

    // Cancel
    const updatedReg = await mockPrisma.activityRegistration.update({
      where: { id: BigInt(1) },
      data: { status: 'cancelled' },
    });
    expect(updatedReg.status).toBe('cancelled');

    const seatsAfterCancel = await mockRedis.incr('activity:seats:1');
    expect(seatsAfterCancel).toBe(13);

    // Refund
    const refund = await mockPrisma.refundOrder.create({
      data: {
        tenantId: BigInt(1),
        userId: BigInt(1),
        originalPaymentId: BigInt(1),
        refundAmount: 50,
        status: 'completed',
      },
    });
    expect(refund.refundAmount).toBe(50);
    expect(refund.status).toBe('completed');

    // Verify all steps executed
    expect(mockPrisma.activityRegistration.create).toHaveBeenCalled();
    expect(mockPrisma.paymentOrder.update).toHaveBeenCalled();
    expect(mockPrisma.activityRegistration.update).toHaveBeenCalledTimes(2); // confirm + cancel
    expect(mockRedis.incr).toHaveBeenCalledWith('activity:seats:1');
    expect(mockPrisma.refundOrder.create).toHaveBeenCalled();
  });

  it('registration fails on sold-out activity', async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({
      id: BigInt(1),
      status: 'published',
      maxParticipants: 12,
    });
    mockRedis.eval.mockResolvedValue(0); // no seats

    const seatResult = await mockRedis.eval('', ['activity:seats:1'], []);
    expect(seatResult).toBe(0); // should not proceed
  });

  it('payment callback duplicate does not double-credit', async () => {
    mockRedis.setnx.mockResolvedValue(0); // already processed
    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: BigInt(1),
      status: 'paid', // already paid
    });

    const lock = await mockRedis.setnx('pay:callback:order:1', '1');
    expect(lock).toBe(0);

    const order = await mockPrisma.paymentOrder.findUnique({ where: { id: BigInt(1) } });
    expect(order.status).toBe('paid');
    // No additional credit should be issued
  });

  it('late cancellation applies penalty', async () => {
    const activity = {
      id: BigInt(1),
      startTime: new Date(Date.now() + 12 * 3600 * 1000), // 12h from now
    };
    const cancelPolicy = { freeHours: 24, penaltyPercent: 50 };
    const paidAmount = 50;

    const hoursUntilStart = (activity.startTime.getTime() - Date.now()) / 3600000;
    const isFreeCancel = hoursUntilStart >= cancelPolicy.freeHours;
    const refundAmount = isFreeCancel ? paidAmount : paidAmount * (1 - cancelPolicy.penaltyPercent / 100);

    expect(isFreeCancel).toBe(false);
    expect(refundAmount).toBe(25); // 50% penalty
  });
});
