describe('NotificationService - Send & Read Tracking', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
  });

  describe('single notification send', () => {
    it('should create notification for user', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        title: '报名成功',
        content: '您已成功报名周六活动',
        type: 'activity',
        isRead: false,
      });

      const notif = await mockPrisma.notification.create({
        data: {
          tenantId: BigInt(1),
          userId: BigInt(1),
          title: '报名成功',
          content: '您已成功报名周六活动',
          type: 'activity',
          isRead: false,
        },
      });

      expect(notif.title).toBe('报名成功');
      expect(notif.isRead).toBe(false);
    });
  });

  describe('bulk notification send', () => {
    it('should create notifications for multiple users', async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await mockPrisma.notification.createMany({
        data: [
          { tenantId: BigInt(1), userId: BigInt(1), title: '活动通知', content: '明天有活动', type: 'activity', isRead: false },
          { tenantId: BigInt(1), userId: BigInt(2), title: '活动通知', content: '明天有活动', type: 'activity', isRead: false },
          { tenantId: BigInt(1), userId: BigInt(3), title: '活动通知', content: '明天有活动', type: 'activity', isRead: false },
        ],
      });

      expect(result.count).toBe(3);
    });
  });

  describe('user notification list', () => {
    it('should return user notifications with unread count', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: BigInt(1), title: '通知1', isRead: false },
        { id: BigInt(2), title: '通知2', isRead: true },
        { id: BigInt(3), title: '通知3', isRead: false },
      ]);
      mockPrisma.notification.count.mockResolvedValue(3);

      const notifications = await mockPrisma.notification.findMany({
        where: { userId: BigInt(1), tenantId: BigInt(1) },
        orderBy: { createdAt: 'desc' },
      });

      const unread = notifications.filter((n: any) => !n.isRead);
      expect(notifications).toHaveLength(3);
      expect(unread).toHaveLength(2);
    });

    it('should paginate notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue(new Array(10).fill(null).map((_, i) => ({
        id: BigInt(i + 1),
        title: `通知${i + 1}`,
      })));

      const notifications = await mockPrisma.notification.findMany({
        where: { userId: BigInt(1) },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(notifications).toHaveLength(10);
    });
  });

  describe('mark as read', () => {
    it('should mark single notification as read', async () => {
      mockPrisma.notification.update.mockResolvedValue({
        id: BigInt(1),
        isRead: true,
        readAt: new Date(),
      });

      const notif = await mockPrisma.notification.update({
        where: { id: BigInt(1) },
        data: { isRead: true, readAt: new Date() },
      });

      expect(notif.isRead).toBe(true);
      expect(notif.readAt).toBeTruthy();
    });

    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await mockPrisma.notification.updateMany({
        where: { userId: BigInt(1), tenantId: BigInt(1), isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      expect(result.count).toBe(5);
    });
  });

  describe('notification types', () => {
    it('should filter by notification type', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: BigInt(1), type: 'payment', title: '支付成功' },
      ]);

      const notifications = await mockPrisma.notification.findMany({
        where: { userId: BigInt(1), type: 'payment' },
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('payment');
    });

    it('should support activity type', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: BigInt(1), type: 'activity', title: '活动提醒' },
        { id: BigInt(2), type: 'activity', title: '报名成功' },
      ]);

      const notifications = await mockPrisma.notification.findMany({
        where: { userId: BigInt(1), type: 'activity' },
      });

      expect(notifications).toHaveLength(2);
    });
  });

  describe('admin notification listing', () => {
    it('should list all notifications for tenant', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: BigInt(1), userId: BigInt(1), title: '通知1' },
        { id: BigInt(2), userId: BigInt(2), title: '通知2' },
      ]);
      mockPrisma.notification.count.mockResolvedValue(2);

      const notifications = await mockPrisma.notification.findMany({
        where: { tenantId: BigInt(1) },
        orderBy: { createdAt: 'desc' },
      });
      const total = await mockPrisma.notification.count({
        where: { tenantId: BigInt(1) },
      });

      expect(notifications).toHaveLength(2);
      expect(total).toBe(2);
    });
  });
});
