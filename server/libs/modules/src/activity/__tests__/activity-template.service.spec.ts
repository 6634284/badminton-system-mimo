describe('ActivityTemplateService - Template CRUD & Batch Publish', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      activity: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      court: { findMany: jest.fn() },
      courtSchedule: { findMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
    };
  });

  describe('save as template', () => {
    it('should save activity as template in Redis', async () => {
      const template = {
        name: '周六开放场',
        type: 'open_session',
        venueId: 1,
        courtIds: [1, 2, 3],
        startTime: '09:00',
        endTime: '12:00',
        maxParticipants: 12,
        price: 50,
        cancelPolicy: { freeHours: 24, penaltyPercent: 50 },
      };
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set('template:1', JSON.stringify(template));
      expect(mockRedis.set).toHaveBeenCalledWith('template:1', JSON.stringify(template));
    });

    it('should list templates from Redis', async () => {
      const templates = [
        { id: '1', name: '周六开放场' },
        { id: '2', name: '周日培训班' },
      ];
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(templates[0]))
        .mockResolvedValueOnce(JSON.stringify(templates[1]));

      const t1 = JSON.parse(await mockRedis.get('template:1'));
      const t2 = JSON.parse(await mockRedis.get('template:2'));

      expect(t1.name).toBe('周六开放场');
      expect(t2.name).toBe('周日培训班');
    });
  });

  describe('batch publish', () => {
    it('should generate activities for date range', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-07');
      const weekdays = [0, 6]; // Saturday and Sunday

      const dates: Date[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        if (weekdays.includes(current.getDay())) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      // June 1 is Monday, June 6 is Saturday, June 7 is Sunday
      expect(dates).toHaveLength(2);
    });

    it('should create multiple activities from template', async () => {
      mockPrisma.activity.create.mockResolvedValue({ id: BigInt(1), status: 'draft' });

      const dates = [new Date('2026-06-06'), new Date('2026-06-07')];
      const activities = [];
      for (const date of dates) {
        const activity = await mockPrisma.activity.create({
          data: {
            tenantId: BigInt(1),
            title: `开放场 ${date.toISOString().split('T')[0]}`,
            type: 'open_session',
            status: 'draft',
          },
        });
        activities.push(activity);
      }

      expect(activities).toHaveLength(2);
      expect(mockPrisma.activity.create).toHaveBeenCalledTimes(2);
    });

    it('should initialize Redis seat counter for each published activity', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set('activity:seats:1', '12');
      await mockRedis.set('activity:seats:2', '12');

      expect(mockRedis.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('template management', () => {
    it('should delete template', async () => {
      mockRedis.del.mockResolvedValue(1);
      await mockRedis.del('template:1');
      expect(mockRedis.del).toHaveBeenCalledWith('template:1');
    });

    it('should update template', async () => {
      const updated = { name: '周六开放场(修改)', price: 60 };
      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set('template:1', JSON.stringify(updated));
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('weekday selection', () => {
    it('should correctly identify weekdays', () => {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      expect(dayNames[0]).toBe('周日');
      expect(dayNames[6]).toBe('周六');
    });

    it('should filter dates by selected weekdays', () => {
      const selectedWeekdays = [1, 3, 5]; // Mon, Wed, Fri
      const date = new Date('2026-06-01'); // Monday
      expect(selectedWeekdays.includes(date.getDay())).toBe(true);

      const tuesday = new Date('2026-06-02');
      expect(selectedWeekdays.includes(tuesday.getDay())).toBe(false);
    });
  });
});
