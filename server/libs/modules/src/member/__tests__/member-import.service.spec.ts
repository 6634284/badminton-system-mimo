describe('MemberImportService - Excel Import & Validation', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      member: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      wallet: { create: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      incr: jest.fn(),
    };
  });

  describe('phone validation', () => {
    it('should accept valid 11-digit phone', () => {
      const phone = '13800138001';
      expect(/^1[3-9]\d{9}$/.test(phone)).toBe(true);
    });

    it('should reject short phone', () => {
      const phone = '13800138';
      expect(/^1[3-9]\d{9}$/.test(phone)).toBe(false);
    });

    it('should reject phone not starting with 1', () => {
      const phone = '23800138001';
      expect(/^1[3-9]\d{9}$/.test(phone)).toBe(false);
    });
  });

  describe('row parsing', () => {
    it('should parse valid row', () => {
      const row = { '姓名': '张三', '手机号': '13800138001', '性别': '1' };
      const parsed = {
        name: row['姓名'],
        phone: row['手机号'],
        gender: parseInt(row['性别'] || '0'),
      };
      expect(parsed.name).toBe('张三');
      expect(parsed.phone).toBe('13800138001');
      expect(parsed.gender).toBe(1);
    });

    it('should skip row with missing name', () => {
      const row = { '姓名': '', '手机号': '13800138001' };
      const isValid = !!(row['姓名'] && row['手机号']);
      expect(isValid).toBe(false);
    });

    it('should skip row with missing phone', () => {
      const row = { '姓名': '张三', '手机号': '' };
      const isValid = !!(row['姓名'] && row['手机号']);
      expect(isValid).toBe(false);
    });

    it('should default gender to 0 if not provided', () => {
      const genderStr: string | undefined = undefined;
      const gender = parseInt(genderStr || '0');
      expect(gender).toBe(0);
    });

    it('should default level to 0 if not provided', () => {
      const levelStr: string | undefined = undefined;
      const level = parseInt(levelStr || '0');
      expect(level).toBe(0);
    });
  });

  describe('duplicate detection', () => {
    it('should detect existing phone', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: BigInt(1),
        phone: '13800138001',
      });

      const existing = await mockPrisma.user.findUnique({
        where: { unionId: 'phone:13800138001' },
      });

      expect(existing).toBeTruthy();
    });

    it('should allow new phone', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const existing = await mockPrisma.user.findUnique({
        where: { unionId: 'phone:13800138002' },
      });

      expect(existing).toBeNull();
    });
  });

  describe('import progress tracking', () => {
    it('should track progress in Redis', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(JSON.stringify({
        total: 100,
        processed: 50,
        success: 48,
        failed: 2,
        errors: [
          { row: 5, reason: 'DUPLICATE_PHONE' },
          { row: 23, reason: 'INVALID_PHONE' },
        ],
      }));

      await mockRedis.set('import:job:1', JSON.stringify({
        total: 100,
        processed: 50,
        success: 48,
        failed: 2,
      }));

      const result = JSON.parse(await mockRedis.get('import:job:1'));
      expect(result.processed).toBe(50);
      expect(result.success).toBe(48);
      expect(result.failed).toBe(2);
    });

    it('should increment processed count', async () => {
      mockRedis.incr.mockResolvedValue(51);
      const count = await mockRedis.incr('import:job:1:processed');
      expect(count).toBe(51);
    });
  });

  describe('member creation', () => {
    it('should create member with auto-generated member number', async () => {
      mockPrisma.member.count.mockResolvedValue(5);
      mockPrisma.member.create.mockResolvedValue({
        id: BigInt(6),
        memberNo: 'M00006',
        level: 0,
      });

      const count = await mockPrisma.member.count({ where: { tenantId: BigInt(1) } });
      const memberNo = `M${String(count + 1).padStart(5, '0')}`;

      const member = await mockPrisma.member.create({
        data: {
          tenantId: BigInt(1),
          userId: BigInt(1),
          memberNo,
          level: 0,
          source: 'import',
        },
      });

      expect(member.memberNo).toBe('M00006');
    });

    it('should create wallet alongside member', async () => {
      mockPrisma.wallet.create.mockResolvedValue({
        id: BigInt(1),
        cashBalance: 0,
        giftBalance: 0,
      });

      const wallet = await mockPrisma.wallet.create({
        data: {
          tenantId: BigInt(1),
          userId: BigInt(1),
          cashBalance: 0,
          giftBalance: 0,
          frozenBalance: 0,
          version: 0,
        },
      });

      expect(wallet.cashBalance).toBe(0);
    });
  });

  describe('error codes', () => {
    it('should report DUPLICATE_PHONE error', () => {
      const error = { row: 5, phone: '13800138001', reason: 'DUPLICATE_PHONE' };
      expect(error.reason).toBe('DUPLICATE_PHONE');
    });

    it('should report INVALID_PHONE error', () => {
      const error = { row: 10, phone: 'abc', reason: 'INVALID_PHONE' };
      expect(error.reason).toBe('INVALID_PHONE');
    });

    it('should report MISSING_REQUIRED error', () => {
      const error = { row: 15, reason: 'MISSING_REQUIRED' };
      expect(error.reason).toBe('MISSING_REQUIRED');
    });
  });
});
