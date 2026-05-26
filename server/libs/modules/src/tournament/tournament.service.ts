import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, userId: bigint, dto: any) {
    return this.prisma.tournament.create({
      data: { tenantId, title: dto.title, venueId: dto.venueId ? BigInt(dto.venueId) : null, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), formatType: dto.formatType, status: 'draft', rules: dto.rules || {}, createdBy: userId },
    });
  }

  async findAll(tenantId: bigint, page = 1, pageSize = 20, status?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.tournament.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.tournament.count({ where }),
    ]);
    return { list: items.map((t) => this.format(t)), total, page, pageSize };
  }

  async findOne(tenantId: bigint, id: bigint) {
    const t = await this.prisma.tournament.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!t) throw new NotFoundException('赛事不存在');

    const [registrations, matches] = await Promise.all([
      this.prisma.tournamentRegistration.findMany({ where: { tournamentId: id, status: 'confirmed' } }),
      this.prisma.tournamentMatch.findMany({ where: { tournamentId: id }, orderBy: [{ roundNo: 'asc' }, { id: 'asc' }] }),
    ]);

    return { ...this.format(t), registrations: registrations.map((r) => ({ id: r.id.toString(), user_id: r.userId.toString(), status: r.status })), matches: matches.map((m) => ({ id: m.id.toString(), round: m.roundNo, player_a: m.playerAId?.toString(), player_b: m.playerBId?.toString(), score: m.scoreText, winner: m.winnerUserId?.toString(), status: m.status })) };
  }

  async updateStatus(id: bigint, status: string) {
    return this.prisma.tournament.update({ where: { id }, data: { status } });
  }

  async register(tenantId: bigint, userId: bigint, memberId: bigint, tournamentId: bigint) {
    const existing = await this.prisma.tournamentRegistration.findUnique({ where: { tournamentId_userId: { tournamentId, userId } } });
    if (existing) throw new BadRequestException('已报名该赛事');
    return this.prisma.tournamentRegistration.create({ data: { tenantId, tournamentId, userId, memberId, status: 'confirmed' } });
  }

  async cancelRegistration(tenantId: bigint, userId: bigint, tournamentId: bigint) {
    return this.prisma.tournamentRegistration.update({ where: { tournamentId_userId: { tournamentId, userId } }, data: { status: 'canceled' } });
  }

  async getRegistrations(tenantId: bigint, tournamentId: bigint) {
    return this.prisma.tournamentRegistration.findMany({ where: { tenantId, tournamentId, status: 'confirmed' }, orderBy: { createdAt: 'asc' } });
  }

  async generateBracket(tenantId: bigint, tournamentId: bigint) {
    const registrations = await this.getRegistrations(tenantId, tournamentId);
    if (registrations.length < 2) throw new BadRequestException('参赛人数不足');

    const rounds = Math.ceil(Math.log2(registrations.length));
    const matches: any[] = [];
    let roundNo = 1;

    for (let i = 0; i < registrations.length; i += 2) {
      const playerA = registrations[i];
      const playerB = registrations[i + 1];
      matches.push({
        tenantId, tournamentId, roundNo,
        playerAId: playerA.userId, playerBId: playerB?.userId || null,
        status: playerB ? 'pending' : 'finished',
        winnerUserId: playerB ? null : playerA.userId,
      });
    }

    let matchCount = Math.floor(registrations.length / 2);
    for (let r = 2; r <= rounds; r++) {
      roundNo = r;
      matchCount = Math.ceil(matchCount / 2);
      for (let i = 0; i < matchCount; i++) {
        matches.push({ tenantId, tournamentId, roundNo, status: 'pending' });
      }
    }

    await this.prisma.tournamentMatch.createMany({ data: matches });
    await this.updateStatus(tournamentId, 'ongoing');
    this.logger.log(`Bracket generated for tournament ${tournamentId}: ${matches.length} matches`);
    return { rounds, total_matches: matches.length };
  }

  async updateMatchResult(matchId: bigint, dto: { scoreText: string; winnerUserId: string }) {
    return this.prisma.tournamentMatch.update({ where: { id: matchId }, data: { scoreText: dto.scoreText, winnerUserId: BigInt(dto.winnerUserId), status: 'finished', playedAt: new Date() } });
  }

  async getMatches(tenantId: bigint, tournamentId: bigint) {
    return this.prisma.tournamentMatch.findMany({ where: { tenantId, tournamentId }, orderBy: [{ roundNo: 'asc' }, { id: 'asc' }] });
  }

  private format(t: any) {
    return {
      id: t.id.toString(), tenant_id: t.tenantId.toString(), title: t.title,
      start_date: t.startDate?.toISOString().slice(0, 10), end_date: t.endDate?.toISOString().slice(0, 10),
      format_type: t.formatType, status: t.status, rules: t.rules, created_at: t.createdAt?.toISOString(),
    };
  }
}
