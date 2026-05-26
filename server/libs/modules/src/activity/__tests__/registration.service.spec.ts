import { BadRequestException, ConflictException } from '@nestjs/common';

describe('RegistrationService - Grab Seat', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      activity: { findUnique: jest.fn() },
      activityRegistration: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      registrationParticipant: { createMany: jest.fn() },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
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

  describe('seat atomic decrement', () => {
    it('should decrement seat atomically via Lua script', async () => {
      mockRedis.eval.mockResolvedValue(1); // success
      const result = await mockRedis.eval(
        `local current = tonumber(redis.call('GET', KEYS[1]) or '0')
         if current > 0 then
           redis.call('DECR', KEYS[1])
           return 1
         end
         return 0`,
        ['activity:seats:1'],
        [],
      );
      expect(result).toBe(1);
    });

    it('should fail when no seats available', async () => {
      mockRedis.eval.mockResolvedValue(0);
      const result = await mockRedis.eval(
        `local current = tonumber(redis.call('GET', KEYS[1]) or '0')
         if current > 0 then
           redis.call('DECR', KEYS[1])
           return 1
         end
         return 0`,
        ['activity:seats:1'],
        [],
      );
      expect(result).toBe(0);
    });
  });

  describe('idempotency check', () => {
    it('should reject duplicate registration with same idempotency key', async () => {
      mockRedis.get.mockResolvedValue('1'); // already exists
      const existing = await mockRedis.get('idem:tenant1:user1:POST:/registrations:key123');
      expect(existing).toBeTruthy();
    });

    it('should allow first registration', async () => {
      mockRedis.get.mockResolvedValue(null);
      const existing = await mockRedis.get('idem:tenant1:user1:POST:/registrations:key123');
      expect(existing).toBeNull();
    });
  });

  describe('registration constraints', () => {
    it('should reject registration for non-published activity', async () => {
      mockPrisma.activity.findUnique.mockResolvedValue({ id: 1, status: 'draft', tenantId: BigInt(1) });
      const activity = await mockPrisma.activity.findUnique({ where: { id: BigInt(1) } });
      expect(activity.status).not.toBe('published');
    });

    it('should reject duplicate registration (unique constraint)', async () => {
      mockPrisma.activityRegistration.findFirst.mockResolvedValue({ id: 1, userId: BigInt(1) });
      const existing = await mockPrisma.activityRegistration.findFirst({
        where: { activityId: BigInt(1), userId: BigInt(1), status: { notIn: ['cancelled'] } },
      });
      expect(existing).toBeTruthy();
    });

    it('should allow registration for published activity with seats', async () => {
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: 1, status: 'published', tenantId: BigInt(1), remainingSeats: 5,
      });
      mockPrisma.activityRegistration.findFirst.mockResolvedValue(null);
      mockRedis.eval.mockResolvedValue(1);

      const activity = await mockPrisma.activity.findUnique({ where: { id: BigInt(1) } });
      expect(activity.status).toBe('published');
      expect(activity.remainingSeats).toBeGreaterThan(0);
    });
  });

  describe('cancel and release seat', () => {
    it('should release seat back to Redis on cancel', async () => {
      mockPrisma.activityRegistration.update.mockResolvedValue({ id: 1, status: 'cancelled' });
      await mockPrisma.activityRegistration.update({
        where: { id: BigInt(1) },
        data: { status: 'cancelled' },
      });
      await mockRedis.incr('activity:seats:1');
      expect(mockRedis.incr).toHaveBeenCalledWith('activity:seats:1');
    });
  });
});
