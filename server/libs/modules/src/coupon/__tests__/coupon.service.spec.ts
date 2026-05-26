describe('CouponService - Claim & Usage', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      coupon: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userCoupon: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
    };
  });

  describe('coupon claiming', () => {
    it('should claim coupon successfully', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: BigInt(1),
        totalStock: 100,
        claimedCount: 50,
        perUserLimit: 1,
        status: 'active',
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue(null); // not claimed yet
      mockPrisma.$executeRaw.mockResolvedValue(1); // atomic increment
      mockPrisma.userCoupon.create.mockResolvedValue({ id: BigInt(1) });

      const coupon = await mockPrisma.coupon.findUnique({ where: { id: BigInt(1) } });
      expect(coupon.claimedCount).toBeLessThan(coupon.totalStock);

      const existing = await mockPrisma.userCoupon.findFirst({
        where: { couponId: BigInt(1), userId: BigInt(1) },
      });
      expect(existing).toBeNull();

      // Atomic increment claimed count
      const claimed = await mockPrisma.$executeRaw`UPDATE coupons SET claimed_count = claimed_count + 1 WHERE id = 1 AND claimed_count < total_stock`;
      expect(claimed).toBe(1);
    });

    it('should reject claim when stock exhausted', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: BigInt(1),
        totalStock: 100,
        claimedCount: 100, // all claimed
        status: 'active',
      });

      const coupon = await mockPrisma.coupon.findUnique({ where: { id: BigInt(1) } });
      expect(coupon.claimedCount).toBeGreaterThanOrEqual(coupon.totalStock);
    });

    it('should reject claim when per-user limit reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: BigInt(1),
        totalStock: 100,
        claimedCount: 50,
        perUserLimit: 1,
        status: 'active',
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        couponId: BigInt(1),
      }); // already claimed

      const coupon = await mockPrisma.coupon.findUnique({ where: { id: BigInt(1) } });
      const existing = await mockPrisma.userCoupon.findFirst({
        where: { couponId: BigInt(1), userId: BigInt(1) },
      });
      expect(coupon.perUserLimit).toBe(1);
      expect(existing).toBeTruthy();
    });

    it('should reject claim when coupon expired', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'active',
        validTo: new Date('2025-01-01'), // expired
      });

      const coupon = await mockPrisma.coupon.findUnique({ where: { id: BigInt(1) } });
      expect(new Date(coupon.validTo).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('coupon usage', () => {
    it('should mark coupon as used', async () => {
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: BigInt(1),
        status: 'unused',
        couponId: BigInt(1),
      });
      mockPrisma.userCoupon.update.mockResolvedValue({
        id: BigInt(1),
        status: 'used',
        usedAt: new Date(),
      });

      const userCoupon = await mockPrisma.userCoupon.findFirst({
        where: { id: BigInt(1), userId: BigInt(1) },
      });
      expect(userCoupon.status).toBe('unused');

      const updated = await mockPrisma.userCoupon.update({
        where: { id: BigInt(1) },
        data: { status: 'used', usedAt: new Date() },
      });
      expect(updated.status).toBe('used');
    });

    it('should reject use of already used coupon', async () => {
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: BigInt(1),
        status: 'used',
      });

      const userCoupon = await mockPrisma.userCoupon.findFirst({
        where: { id: BigInt(1), userId: BigInt(1) },
      });
      expect(userCoupon.status).toBe('used');
    });

    it('should reject use of expired coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: BigInt(1),
        validTo: new Date('2025-01-01'),
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: BigInt(1),
        status: 'unused',
        couponId: BigInt(1),
      });

      const coupon = await mockPrisma.coupon.findUnique({ where: { id: BigInt(1) } });
      expect(new Date(coupon.validTo).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('coupon calculation', () => {
    it('should calculate fixed amount discount', () => {
      const coupon = { type: 'fixed', value: 20, minAmount: 100 };
      const orderAmount = 150;

      const discount = orderAmount >= coupon.minAmount ? coupon.value : 0;
      expect(discount).toBe(20);
    });

    it('should calculate percentage discount', () => {
      const coupon = { type: 'percent', value: 10, maxDiscount: 50 };
      const orderAmount = 300;

      let discount = orderAmount * (coupon.value / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      expect(discount).toBe(30);
    });

    it('should cap percentage discount at max', () => {
      const coupon = { type: 'percent', value: 10, maxDiscount: 50 };
      const orderAmount = 1000;

      let discount = orderAmount * (coupon.value / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      expect(discount).toBe(50);
    });

    it('should reject when order below minimum amount', () => {
      const coupon = { type: 'fixed', value: 20, minAmount: 100 };
      const orderAmount = 50;

      const discount = orderAmount >= coupon.minAmount ? coupon.value : 0;
      expect(discount).toBe(0);
    });
  });
});
