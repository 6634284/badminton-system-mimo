import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

const POINTS_MAP: Record<string, number> = {
  champion: 100,
  runner_up: 60,
  semi_finalist: 30,
  quarter_finalist: 15,
  participant: 5,
  win: 10,
  loss: 2,
};

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Award ranking points after tournament completion
   */
  async awardTournamentPoints(tenantId: bigint, tournamentId: bigint) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return;

    const registrations = await this.prisma.tournamentRegistration.findMany({
      where: { tenantId, tournamentId, status: 'confirmed' },
    });

    const matches = await this.prisma.tournamentMatch.findMany({
      where: { tenantId, tournamentId, status: 'finished' },
    });

    // Calculate points per player
    const playerPoints = new Map<string, number>();

    // Find champion (winner of final round)
    const maxRound = Math.max(...matches.map((m) => m.roundNo), 0);
    const finalMatch = matches.find((m) => m.roundNo === maxRound && m.winnerUserId);
    if (finalMatch) {
      const championId = finalMatch.winnerUserId!.toString();
      playerPoints.set(championId, POINTS_MAP.champion);

      // Runner up
      const loserId = finalMatch.playerAId?.toString() === championId
        ? finalMatch.playerBId?.toString()
        : finalMatch.playerAId?.toString();
      if (loserId) playerPoints.set(loserId, POINTS_MAP.runner_up);
    }

    // Award participation points to everyone
    for (const reg of registrations) {
      const uid = reg.userId.toString();
      if (!playerPoints.has(uid)) {
        playerPoints.set(uid, POINTS_MAP.participant);
      }
    }

    // Award win/loss points from each match
    for (const match of matches) {
      if (match.winnerUserId) {
        const winnerId = match.winnerUserId.toString();
        const current = playerPoints.get(winnerId) || 0;
        playerPoints.set(winnerId, current + POINTS_MAP.win);

        const loserId = match.playerAId?.toString() === winnerId
          ? match.playerBId?.toString()
          : match.playerAId?.toString();
        if (loserId) {
          const loserCurrent = playerPoints.get(loserId) || 0;
          playerPoints.set(loserId, loserCurrent + POINTS_MAP.loss);
        }
      }
    }

    // Write point logs
    const logs: any[] = [];
    for (const [userId, points] of playerPoints.entries()) {
      logs.push({
        tenantId, userId: BigInt(userId), tournamentId,
        pointDelta: points, reason: 'tournament_result',
      });
    }

    if (logs.length > 0) {
      await this.prisma.rankingPointLog.createMany({ data: logs });
    }

    this.logger.log(`Ranking points awarded for tournament ${tournamentId}: ${logs.length} players`);
    return { tournament_id: tournamentId.toString(), players_awarded: logs.length };
  }

  /**
   * Get leaderboard for a tenant
   */
  async getLeaderboard(tenantId: bigint, limit = 50) {
    const result = await this.prisma.$queryRaw<{ user_id: bigint; total_points: number }[]>`
      SELECT user_id, SUM(point_delta)::int as total_points
      FROM ranking_point_logs
      WHERE tenant_id = ${tenantId}
      GROUP BY user_id
      ORDER BY total_points DESC
      LIMIT ${limit}
    `;

    // Enrich with user info
    const userIds = result.map((r) => r.user_id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id.toString(), u]));

    return result.map((r, index) => {
      const user = userMap.get(r.user_id.toString());
      return {
        rank: index + 1,
        user_id: r.user_id.toString(),
        nickname: user?.nickname,
        avatar_url: user?.avatarUrl,
        total_points: r.total_points,
      };
    });
  }

  /**
   * Get user's point history
   */
  async getUserHistory(tenantId: bigint, userId: bigint, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.rankingPointLog.findMany({
        where: { tenantId, userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rankingPointLog.count({ where: { tenantId, userId } }),
    ]);

    const totalPoints = await this.prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(point_delta), 0)::int as total
      FROM ranking_point_logs
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    `;

    return {
      total_points: totalPoints[0]?.total || 0,
      history: items.map((l) => ({
        id: l.id.toString(),
        tournament_id: l.tournamentId?.toString(),
        match_id: l.matchId?.toString(),
        point_delta: l.pointDelta,
        reason: l.reason,
        created_at: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }
}
