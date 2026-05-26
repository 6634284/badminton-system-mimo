import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { MemberQueryDto, UpdateMemberDto } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureMember(tenantId: bigint, userId: bigint, source?: string): Promise<bigint> {
    const existing = await this.prisma.member.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (existing) return existing.id;

    const memberNo = await this.generateMemberNo(tenantId);

    const member = await this.prisma.member.create({
      data: {
        tenantId,
        userId,
        memberNo,
        level: 1,
        points: 0,
        totalSpentAmount: 0,
        source: source || 'self_register',
        tags: [],
        blacklisted: false,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Member created: ${member.id} for user ${userId} in tenant ${tenantId}`);
    return member.id;
  }

  async findAll(tenantId: bigint, query: MemberQueryDto) {
    const { keyword, level, blacklisted, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId, deletedAt: null };

    if (level !== undefined) where.level = level;
    if (blacklisted !== undefined) where.blacklisted = blacklisted;
    if (keyword) {
      where.OR = [
        { memberNo: { contains: keyword, mode: 'insensitive' } },
        { note: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.member.count({ where }),
    ]);

    const userIds = members.map((m) => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id.toString(), u]));

    return {
      list: members.map((m) => this.formatMember(m, userMap.get(m.userId.toString()))),
      total,
      page,
      pageSize,
    };
  }

  async findOne(tenantId: bigint, memberId: bigint) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.tenantId !== tenantId || member.deletedAt) {
      throw new NotFoundException('会员不存在');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: member.userId },
    });

    return this.formatMember(member, user);
  }

  async findByUser(tenantId: bigint, userId: bigint) {
    const member = await this.prisma.member.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!member || member.deletedAt) {
      throw new NotFoundException('会员不存在');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: member.userId },
    });

    return this.formatMember(member, user);
  }

  async update(tenantId: bigint, memberId: bigint, dto: UpdateMemberDto) {
    const member = await this.findOne(tenantId, memberId);

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: {
        level: dto.level,
        tags: dto.tags,
        note: dto.note,
        blacklisted: dto.blacklisted,
      },
    });

    return this.formatMember(updated);
  }

  async getMemberCards(tenantId: bigint, memberId: bigint) {
    const cards = await this.prisma.memberCard.findMany({
      where: {
        tenantId,
        memberId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cards.map((c) => ({
      id: c.id.toString(),
      card_type: c.cardType,
      card_name: c.cardName,
      total_count: c.totalCount,
      used_count: c.usedCount,
      valid_from: c.validFrom?.toISOString(),
      valid_to: c.validTo?.toISOString(),
      status: c.status,
      created_at: c.createdAt.toISOString(),
    }));
  }

  async importMembers(tenantId: bigint, rows: { phone: string; nickname?: string; level?: number; source?: string }[]) {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const phoneHash = crypto.createHash('sha256').update(row.phone).digest('hex');

        let user = await this.prisma.user.findFirst({ where: { phoneHash } });
        if (!user) {
          user = await this.prisma.user.create({
            data: {
              phone: row.phone,
              phoneHash,
              nickname: row.nickname || `用户${row.phone.slice(-4)}`,
              status: 'active',
            },
          });
        }

        const existing = await this.prisma.member.findUnique({
          where: { tenantId_userId: { tenantId, userId: user.id } },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const memberNo = await this.generateMemberNo(tenantId);
        await this.prisma.member.create({
          data: {
            tenantId,
            userId: user.id,
            memberNo,
            level: row.level || 1,
            source: row.source || 'import',
            tags: [],
          },
        });

        imported++;
      } catch (e: any) {
        errors.push(`手机号 ${row.phone}: ${e.message}`);
      }
    }

    return { imported, skipped, errors, total: rows.length };
  }

  private async generateMemberNo(tenantId: bigint): Promise<string> {
    const count = await this.prisma.member.count({ where: { tenantId } });
    return `M${String(count + 1).padStart(6, '0')}`;
  }

  private formatMember(member: any, user?: any) {
    return {
      id: member.id.toString(),
      tenant_id: member.tenantId.toString(),
      user_id: member.userId.toString(),
      member_no: member.memberNo,
      level: member.level,
      points: member.points,
      total_spent_amount: member.totalSpentAmount?.toString(),
      source: member.source,
      tags: member.tags,
      note: member.note,
      blacklisted: member.blacklisted,
      joined_at: member.joinedAt.toISOString(),
      nickname: user?.nickname,
      phone: user?.phone,
      avatar_url: user?.avatarUrl,
    };
  }
}
