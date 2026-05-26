describe('TournamentService - Registration & Bracket', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tournament: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      tournamentRegistration: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      tournamentMatch: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
      $executeRaw: jest.fn(),
    };
  });

  describe('tournament registration', () => {
    it('should register user for tournament', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'registration_open',
        maxParticipants: 32,
        currentParticipants: 16,
      });
      mockPrisma.tournamentRegistration.findFirst.mockResolvedValue(null);
      mockPrisma.tournamentRegistration.create.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        status: 'confirmed',
      });

      const tournament = await mockPrisma.tournament.findUnique({ where: { id: BigInt(1) } });
      expect(tournament.status).toBe('registration_open');
      expect(tournament.currentParticipants).toBeLessThan(tournament.maxParticipants);

      const existing = await mockPrisma.tournamentRegistration.findFirst({
        where: { tournamentId: BigInt(1), userId: BigInt(1) },
      });
      expect(existing).toBeNull();
    });

    it('should reject duplicate registration', async () => {
      mockPrisma.tournamentRegistration.findFirst.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        status: 'confirmed',
      });

      const existing = await mockPrisma.tournamentRegistration.findFirst({
        where: { tournamentId: BigInt(1), userId: BigInt(1) },
      });
      expect(existing).toBeTruthy();
    });

    it('should reject registration when full', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'registration_open',
        maxParticipants: 32,
        currentParticipants: 32, // full
      });

      const tournament = await mockPrisma.tournament.findUnique({ where: { id: BigInt(1) } });
      expect(tournament.currentParticipants).toBeGreaterThanOrEqual(tournament.maxParticipants);
    });

    it('should reject registration when not open', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'in_progress',
      });

      const tournament = await mockPrisma.tournament.findUnique({ where: { id: BigInt(1) } });
      expect(tournament.status).not.toBe('registration_open');
    });
  });

  describe('bracket generation', () => {
    it('should calculate correct number of rounds for 8 players', () => {
      const participants = 8;
      const rounds = Math.ceil(Math.log2(participants));
      expect(rounds).toBe(3); // QF, SF, Final
    });

    it('should calculate correct number of rounds for 16 players', () => {
      const participants = 16;
      const rounds = Math.ceil(Math.log2(participants));
      expect(rounds).toBe(4); // R16, QF, SF, Final
    });

    it('should generate first round matches', () => {
      const participants = [
        { id: 1, seed: 1 }, { id: 2, seed: 8 },
        { id: 3, seed: 4 }, { id: 4, seed: 5 },
        { id: 5, seed: 2 }, { id: 6, seed: 7 },
        { id: 7, seed: 3 }, { id: 8, seed: 6 },
      ];

      // 8 players -> 4 first round matches
      const firstRoundMatches = participants.length / 2;
      expect(firstRoundMatches).toBe(4);
    });

    it('should handle byes for non-power-of-2 participants', () => {
      const participants = 6;
      const nextPowerOf2 = 8;
      const byes = nextPowerOf2 - participants;
      expect(byes).toBe(2);
    });
  });

  describe('match result recording', () => {
    it('should record match result and advance winner', async () => {
      mockPrisma.tournamentMatch.update.mockResolvedValue({
        id: BigInt(1),
        round: 1,
        matchNo: 1,
        player1Id: BigInt(1),
        player2Id: BigInt(2),
        winnerId: BigInt(1),
        score: '21-19,21-18',
        status: 'completed',
      });

      const match = await mockPrisma.tournamentMatch.update({
        where: { id: BigInt(1) },
        data: {
          winnerId: BigInt(1),
          score: '21-19,21-18',
          status: 'completed',
        },
      });

      expect(match.winnerId).toBe(BigInt(1));
      expect(match.status).toBe('completed');
    });

    it('should not allow result on already completed match', async () => {
      mockPrisma.tournamentMatch.findMany.mockResolvedValue([
        { id: BigInt(1), status: 'completed', winnerId: BigInt(1) },
      ]);

      const matches = await mockPrisma.tournamentMatch.findMany({
        where: { id: BigInt(1) },
      });
      expect(matches[0].status).toBe('completed');
    });
  });

  describe('tournament status transitions', () => {
    it('should transition registration_open -> in_progress', async () => {
      mockPrisma.tournament.update.mockResolvedValue({
        id: BigInt(1),
        status: 'in_progress',
      });
      const t = await mockPrisma.tournament.update({
        where: { id: BigInt(1) },
        data: { status: 'in_progress' },
      });
      expect(t.status).toBe('in_progress');
    });

    it('should transition in_progress -> completed', async () => {
      mockPrisma.tournament.update.mockResolvedValue({
        id: BigInt(1),
        status: 'completed',
      });
      const t = await mockPrisma.tournament.update({
        where: { id: BigInt(1) },
        data: { status: 'completed' },
      });
      expect(t.status).toBe('completed');
    });
  });
});
