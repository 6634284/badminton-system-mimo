import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, dto: any) {
    return this.prisma.coach.create({ data: { tenantId, userId: BigInt(dto.userId), name: dto.name, avatarUrl: dto.avatarUrl, intro: dto.intro, level: dto.level, pricePerHour: dto.pricePerHour } });
  }

  async findAll(tenantId: bigint, page = 1, pageSize = 20) {
    const where = { tenantId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.coach.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.coach.count({ where }),
    ]);
    return { list: items.map((c) => this.format(c)), total, page, pageSize };
  }

  async findOne(tenantId: bigint, id: bigint) {
    const coach = await this.prisma.coach.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!coach) throw new NotFoundException('教练不存在');
    const lessons = await this.prisma.coachLesson.findMany({ where: { coachId: id, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return { ...this.format(coach), lessons: lessons.map((l) => ({ id: l.id.toString(), title: l.title, type: l.type, duration: l.durationMinutes, price: l.price.toString(), status: l.status })) };
  }

  async update(id: bigint, dto: any) {
    return this.prisma.coach.update({ where: { id }, data: dto });
  }

  async updateStatus(id: bigint, status: string) {
    return this.prisma.coach.update({ where: { id }, data: { status } });
  }

  async createLesson(tenantId: bigint, coachId: bigint, dto: any) {
    return this.prisma.coachLesson.create({ data: { tenantId, coachId, title: dto.title, type: dto.type, durationMinutes: dto.durationMinutes, price: dto.price } });
  }

  async listLessons(coachId: bigint) {
    return this.prisma.coachLesson.findMany({ where: { coachId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async updateLesson(id: bigint, dto: any) {
    return this.prisma.coachLesson.update({ where: { id }, data: dto });
  }

  async deleteLesson(id: bigint) {
    return this.prisma.coachLesson.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private format(c: any) {
    return {
      id: c.id.toString(), tenant_id: c.tenantId.toString(), user_id: c.userId.toString(),
      name: c.name, avatar_url: c.avatarUrl, intro: c.intro, level: c.level,
      price_per_hour: c.pricePerHour?.toString(), status: c.status, created_at: c.createdAt?.toISOString(),
    };
  }
}
