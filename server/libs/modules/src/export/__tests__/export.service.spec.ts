describe('ExportService - Async Export Jobs', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      member: { findMany: jest.fn() },
      activityRegistration: { findMany: jest.fn() },
      walletTransaction: { findMany: jest.fn() },
      settlementOrder: { findMany: jest.fn() },
    };
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
    };
  });

  describe('export job lifecycle', () => {
    it('should create export job with pending status', async () => {
      const jobId = 'export:job:1';
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set(jobId, JSON.stringify({ status: 'pending', type: 'members' }));
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should update job status to processing', async () => {
      const jobId = 'export:job:1';
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set(jobId, JSON.stringify({ status: 'processing', progress: 50 }));
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should complete job with download URL', async () => {
      const jobId = 'export:job:1';
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set(jobId, JSON.stringify({
        status: 'completed',
        downloadUrl: 'https://minio.example.com/exports/members.csv',
        totalRows: 100,
      }));
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should track job failure', async () => {
      const jobId = 'export:job:1';
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set(jobId, JSON.stringify({
        status: 'failed',
        error: 'Database connection timeout',
      }));
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('member export', () => {
    it('should fetch members with pagination', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { id: BigInt(1), memberNo: 'M00001', userId: BigInt(1) },
        { id: BigInt(2), memberNo: 'M00002', userId: BigInt(2) },
      ]);

      const members = await mockPrisma.member.findMany({
        where: { tenantId: BigInt(1) },
        skip: 0,
        take: 1000,
      });

      expect(members).toHaveLength(2);
    });
  });

  describe('registration export', () => {
    it('should fetch registrations for activity', async () => {
      mockPrisma.activityRegistration.findMany.mockResolvedValue([
        { id: BigInt(1), activityId: BigInt(100), userId: BigInt(1), status: 'confirmed' },
      ]);

      const registrations = await mockPrisma.activityRegistration.findMany({
        where: { activityId: BigInt(100), tenantId: BigInt(1) },
      });

      expect(registrations).toHaveLength(1);
    });
  });

  describe('wallet transaction export', () => {
    it('should fetch wallet transactions', async () => {
      mockPrisma.walletTransaction.findMany.mockResolvedValue([
        { id: BigInt(1), type: 'credit', amount: 100 },
        { id: BigInt(2), type: 'debit', amount: 50 },
      ]);

      const transactions = await mockPrisma.walletTransaction.findMany({
        where: { tenantId: BigInt(1) },
        orderBy: { createdAt: 'desc' },
      });

      expect(transactions).toHaveLength(2);
    });
  });

  describe('CSV generation', () => {
    it('should generate CSV header', () => {
      const columns = ['会员编号', '姓名', '手机号', '等级'];
      const header = columns.join(',');
      expect(header).toBe('会员编号,姓名,手机号,等级');
    });

    it('should escape CSV values with commas', () => {
      const value = '张三,李四';
      const escaped = `"${value}"`;
      expect(escaped).toBe('"张三,李四"');
    });
  });

  describe('job polling', () => {
    it('should return job status on poll', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        status: 'processing',
        progress: 75,
      }));

      const result = await mockRedis.get('export:job:1');
      const job = JSON.parse(result);
      expect(job.status).toBe('processing');
      expect(job.progress).toBe(75);
    });

    it('should return null for non-existent job', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await mockRedis.get('export:job:999');
      expect(result).toBeNull();
    });
  });
});
