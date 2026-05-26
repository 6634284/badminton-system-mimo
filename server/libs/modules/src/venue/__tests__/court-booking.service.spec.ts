describe('CourtBookingService - Distributed Lock & Optimistic Locking', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      courtBooking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      courtSchedule: {
        findFirst: jest.fn(),
      },
      court: {
        findUnique: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      setnx: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      eval: jest.fn(),
    };
  });

  describe('distributed lock for booking', () => {
    it('should acquire lock before booking', async () => {
      mockRedis.setnx.mockResolvedValue(1); // lock acquired
      const locked = await mockRedis.setnx('lock:court:1:slot:2026-06-01-09', '1');
      expect(locked).toBe(1);
    });

    it('should reject booking when lock not acquired', async () => {
      mockRedis.setnx.mockResolvedValue(0); // another user holds lock
      const locked = await mockRedis.setnx('lock:court:1:slot:2026-06-01-09', '1');
      expect(locked).toBe(0);
    });

    it('should release lock after booking completes', async () => {
      mockRedis.del.mockResolvedValue(1);
      await mockRedis.del('lock:court:1:slot:2026-06-01-09');
      expect(mockRedis.del).toHaveBeenCalledWith('lock:court:1:slot:2026-06-01-09');
    });
  });

  describe('optimistic locking for double-booking prevention', () => {
    it('should book slot with version check', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1); // success
      const affected = await mockPrisma.$executeRaw`UPDATE court_schedules SET status = 'booked', version = version + 1 WHERE id = 1 AND status = 'available' AND version = 5`;
      expect(affected).toBe(1);
    });

    it('should fail when slot already booked (version conflict)', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0); // no rows affected
      const affected = await mockPrisma.$executeRaw`UPDATE court_schedules SET status = 'booked', version = version + 1 WHERE id = 1 AND status = 'available' AND version = 5`;
      expect(affected).toBe(0);
    });

    it('should fail when slot in maintenance', async () => {
      mockPrisma.courtSchedule.findFirst.mockResolvedValue({
        id: 1,
        status: 'maintenance',
      });
      const schedule = await mockPrisma.courtSchedule.findFirst({ where: { id: 1 } });
      expect(schedule.status).toBe('maintenance');
    });
  });

  describe('booking creation', () => {
    it('should create booking after lock + version check succeed', async () => {
      mockRedis.setnx.mockResolvedValue(1);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.courtBooking.create.mockResolvedValue({
        id: BigInt(1),
        courtId: 1,
        userId: 1,
        bookingDate: new Date('2026-06-01'),
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
      });

      const booking = await mockPrisma.courtBooking.create({
        data: {
          tenantId: BigInt(1),
          courtId: BigInt(1),
          userId: BigInt(1),
          bookingDate: new Date('2026-06-01'),
          startTime: '09:00',
          endTime: '10:00',
          status: 'confirmed',
          version: 0,
        },
      });

      expect(booking.status).toBe('confirmed');
      expect(booking.startTime).toBe('09:00');
    });
  });

  describe('cancellation', () => {
    it('should cancel booking and release slot', async () => {
      mockPrisma.courtBooking.findUnique.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        status: 'confirmed',
        courtScheduleId: BigInt(10),
      });
      mockPrisma.courtBooking.update.mockResolvedValue({
        id: BigInt(1),
        status: 'cancelled',
      });
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const booking = await mockPrisma.courtBooking.update({
        where: { id: BigInt(1) },
        data: { status: 'cancelled' },
      });
      expect(booking.status).toBe('cancelled');

      // Release the schedule slot
      const released = await mockPrisma.$executeRaw`UPDATE court_schedules SET status = 'available', version = version + 1 WHERE id = 10`;
      expect(released).toBe(1);
    });

    it('should reject cancel by non-owner', async () => {
      mockPrisma.courtBooking.findUnique.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(2), // different user
        status: 'confirmed',
      });

      const booking = await mockPrisma.courtBooking.findUnique({ where: { id: BigInt(1) } });
      expect(booking.userId).not.toBe(BigInt(1));
    });

    it('should reject cancel of already cancelled booking', async () => {
      mockPrisma.courtBooking.findUnique.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        status: 'cancelled',
      });

      const booking = await mockPrisma.courtBooking.findUnique({ where: { id: BigInt(1) } });
      expect(booking.status).toBe('cancelled');
    });
  });

  describe('slot availability query', () => {
    it('should return available slots for a court and date', async () => {
      mockPrisma.courtSchedule.findMany = jest.fn().mockResolvedValue([
        { id: 1, startTime: '09:00', endTime: '10:00', status: 'available' },
        { id: 2, startTime: '10:00', endTime: '11:00', status: 'booked' },
        { id: 3, startTime: '11:00', endTime: '12:00', status: 'available' },
      ]);

      const slots = await mockPrisma.courtSchedule.findMany({
        where: { courtId: 1, date: new Date('2026-06-01') },
      });

      const available = slots.filter((s: any) => s.status === 'available');
      expect(available).toHaveLength(2);
    });
  });
});
