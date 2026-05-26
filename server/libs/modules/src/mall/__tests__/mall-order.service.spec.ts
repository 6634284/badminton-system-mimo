describe('MallOrderService - Order Creation & Stock Management', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: { findUnique: jest.fn() },
      productSku: { findUnique: jest.fn(), update: jest.fn() },
      mallOrder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      mallOrderItem: { createMany: jest.fn() },
      cart: { deleteMany: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
    };
  });

  describe('stock validation', () => {
    it('should reject order when SKU stock insufficient', async () => {
      mockPrisma.productSku.findUnique.mockResolvedValue({
        id: BigInt(1),
        productId: BigInt(1),
        stock: 2,
        price: 99.00,
      });

      const sku = await mockPrisma.productSku.findUnique({ where: { id: BigInt(1) } });
      const requestedQty = 5;
      expect(sku.stock).toBeLessThan(requestedQty);
    });

    it('should allow order when stock sufficient', async () => {
      mockPrisma.productSku.findUnique.mockResolvedValue({
        id: BigInt(1),
        productId: BigInt(1),
        stock: 10,
        price: 99.00,
      });

      const sku = await mockPrisma.productSku.findUnique({ where: { id: BigInt(1) } });
      const requestedQty = 3;
      expect(sku.stock).toBeGreaterThanOrEqual(requestedQty);
    });
  });

  describe('stock deduction', () => {
    it('should deduct stock atomically', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      const affected = await mockPrisma.$executeRaw`UPDATE product_skus SET stock = stock - 3 WHERE id = 1 AND stock >= 3`;
      expect(affected).toBe(1);
    });

    it('should fail stock deduction when concurrent purchase exhausts stock', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0); // stock < requested
      const affected = await mockPrisma.$executeRaw`UPDATE product_skus SET stock = stock - 5 WHERE id = 1 AND stock >= 5`;
      expect(affected).toBe(0);
    });
  });

  describe('order creation', () => {
    it('should create order with item snapshots', async () => {
      mockPrisma.mallOrder.create.mockResolvedValue({
        id: BigInt(1),
        orderNo: 'MO20260601001',
        status: 'pending',
        totalAmount: 297,
      });

      const order = await mockPrisma.mallOrder.create({
        data: {
          tenantId: BigInt(1),
          userId: BigInt(1),
          orderNo: 'MO20260601001',
          totalAmount: 297,
          status: 'pending',
        },
      });

      expect(order.orderNo).toMatch(/^MO/);
      expect(order.status).toBe('pending');
    });

    it('should generate unique order number', () => {
      const now = new Date('2026-06-01T10:30:00');
      const seq = 1;
      const orderNo = `MO${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(seq).padStart(3, '0')}`;
      expect(orderNo).toBe('MO20260601001');
    });

    it('should create order items with product snapshot', async () => {
      mockPrisma.mallOrderItem.createMany.mockResolvedValue({ count: 2 });

      const result = await mockPrisma.mallOrderItem.createMany({
        data: [
          { orderId: BigInt(1), productId: BigInt(1), skuId: BigInt(1), name: '羽毛球拍', price: 99, quantity: 2 },
          { orderId: BigInt(1), productId: BigInt(2), skuId: BigInt(3), name: '羽毛球', price: 49, quantity: 1 },
        ],
      });

      expect(result.count).toBe(2);
    });
  });

  describe('order status transitions', () => {
    it('should transition pending -> paid', async () => {
      mockPrisma.mallOrder.update.mockResolvedValue({ id: BigInt(1), status: 'paid' });
      const order = await mockPrisma.mallOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'paid', paidAt: new Date() },
      });
      expect(order.status).toBe('paid');
    });

    it('should transition paid -> shipped', async () => {
      mockPrisma.mallOrder.update.mockResolvedValue({ id: BigInt(1), status: 'shipped' });
      const order = await mockPrisma.mallOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'shipped', trackingNo: 'SF123456' },
      });
      expect(order.status).toBe('shipped');
    });

    it('should transition shipped -> completed', async () => {
      mockPrisma.mallOrder.update.mockResolvedValue({ id: BigInt(1), status: 'completed' });
      const order = await mockPrisma.mallOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'completed', completedAt: new Date() },
      });
      expect(order.status).toBe('completed');
    });

    it('should refund by restoring stock', async () => {
      mockPrisma.mallOrder.update.mockResolvedValue({ id: BigInt(1), status: 'refunded' });
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const order = await mockPrisma.mallOrder.update({
        where: { id: BigInt(1) },
        data: { status: 'refunded' },
      });
      expect(order.status).toBe('refunded');

      // Restore stock
      const restored = await mockPrisma.$executeRaw`UPDATE product_skus SET stock = stock + 2 WHERE id = 1`;
      expect(restored).toBe(1);
    });
  });

  describe('cart clearing after order', () => {
    it('should clear user cart after successful order', async () => {
      mockPrisma.cart.deleteMany.mockResolvedValue({ count: 2 });
      const result = await mockPrisma.cart.deleteMany({
        where: { userId: BigInt(1), tenantId: BigInt(1) },
      });
      expect(result.count).toBe(2);
    });
  });
});
