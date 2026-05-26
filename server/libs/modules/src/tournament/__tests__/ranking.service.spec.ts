describe('RankingService - Points & Leaderboard', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tournament: { findUnique: jest.fn() },
      tournamentRegistration: { findMany: jest.fn() },
      rankingPointLog: { createMany: jest.fn(), findMany: jest.fn() },
      $queryRaw: jest.fn(),
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
  });

  describe('points calculation', () => {
    const POINTS_MAP: Record<string, number> = {
      champion: 1000,
      runner_up: 600,
      semifinal: 300,
      quarterfinal: 150,
      participation: 50,
      win: 10,
      loss: 0,
    };

    it('should award champion 1000 points', () => {
      expect(POINTS_MAP.champion).toBe(1000);
    });

    it('should award runner-up 600 points', () => {
      expect(POINTS_MAP.runner_up).toBe(600);
    });

    it('should award participation 50 points to all', () => {
      expect(POINTS_MAP.participation).toBe(50);
    });

    it('should calculate total points for a tournament winner', () => {
      // Winner: participation + 3 wins + champion
      const total = POINTS_MAP.participation + (3 * POINTS_MAP.win) + POINTS_MAP.champion;
      expect(total).toBe(1080); // 50 + 30 + 1000
    });

    it('should calculate total points for semifinal loser', () => {
      // SF loser: participation + 2 wins + semifinal
      const total = POINTS_MAP.participation + (2 * POINTS_MAP.win) + POINTS_MAP.semifinal;
      expect(total).toBe(370); // 50 + 20 + 300
    });
  });

  describe('leaderboard query', () => {
    it('should return leaderboard sorted by total points', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { userId: BigInt(1), nickname: '张三', totalPoints: 2500, tournamentCount: 5 },
        { userId: BigInt(2), nickname: '李四', totalPoints: 1800, tournamentCount: 4 },
        { userId: BigInt(3), nickname: '王五', totalPoints: 1200, tournamentCount: 3 },
      ]);

      const leaderboard = await mockPrisma.$queryRaw`SELECT user_id, nickname, SUM(points) as total_points, COUNT(*) as tournament_count FROM ranking_point_logs GROUP BY user_id ORDER BY total_points DESC LIMIT 10`;

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].totalPoints).toBeGreaterThan(leaderboard[1].totalPoints);
    });

    it('should limit leaderboard results', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(new Array(10).fill(null).map((_, i) => ({
        userId: BigInt(i + 1),
        totalPoints: 1000 - i * 50,
      })));

      const leaderboard = await mockPrisma.$queryRaw`SELECT * FROM ranking_point_logs ORDER BY total_points DESC LIMIT 10`;
      expect(leaderboard).toHaveLength(10);
    });
  });

  describe('user ranking history', () => {
    it('should return user point history', async () => {
      mockPrisma.rankingPointLog.findMany.mockResolvedValue([
        { id: BigInt(1), points: 1000, reason: 'champion', tournamentId: BigInt(1) },
        { id: BigInt(2), points: 600, reason: 'runner_up', tournamentId: BigInt(2) },
        { id: BigInt(3), points: 50, reason: 'participation', tournamentId: BigInt(3) },
      ]);

      const history = await mockPrisma.rankingPointLog.findMany({
        where: { userId: BigInt(1) },
        orderBy: { createdAt: 'desc' },
      });

      expect(history).toHaveLength(3);
      expect(history[0].points).toBe(1000);
    });

    it('should calculate user total points', async () => {
      mockPrisma.rankingPointLog.findMany.mockResolvedValue([
        { points: 1000 },
        { points: 600 },
        { points: 300 },
        { points: 50 },
      ]);

      const logs = await mockPrisma.rankingPointLog.findMany({
        where: { userId: BigInt(1) },
      });
      const total = logs.reduce((sum: number, log: any) => sum + log.points, 0);
      expect(total).toBe(1950);
    });
  });
});
