import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { CreateCourtDto, UpdateCourtDto, CourtQueryDto } from './dto';

@Injectable()
export class CourtService {
  private readonly logger = new Logger(CourtService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, dto: CreateCourtDto) {
    const existing = await this.prisma.court.findUnique({
      where: { venueId_code: { venueId: BigInt(dto.venueId), code: dto.code } },
    });
    if (existing) {
      throw new ConflictException('场地编号已存在');
    }

    const court = await this.prisma.court.create({
      data: {
        tenantId,
        venueId: BigInt(dto.venueId),
        code: dto.code,
        type: dto.type || 'standard',
        basePrice: dto.basePrice || 0,
        status: 'active',
      },
    });

    return this.formatCourt(court);
  }

  async findAll(tenantId: bigint, query: CourtQueryDto) {
    const { venueId, status, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId, deletedAt: null };

    if (venueId) where.venueId = BigInt(venueId);
    if (status) where.status = status;

    const [courts, total] = await Promise.all([
      this.prisma.court.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { code: 'asc' },
      }),
      this.prisma.court.count({ where }),
    ]);

    return {
      list: courts.map((c) => this.formatCourt(c)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(tenantId: bigint, courtId: bigint) {
    const court = await this.prisma.court.findUnique({ where: { id: courtId } });

    if (!court || court.tenantId !== tenantId || court.deletedAt) {
      throw new NotFoundException('场地不存在');
    }

    return this.formatCourt(court);
  }

  async findByVenue(venueId: bigint) {
    const courts = await this.prisma.court.findMany({
      where: { venueId, status: 'active', deletedAt: null },
      orderBy: { code: 'asc' },
    });

    return courts.map((c) => this.formatCourt(c));
  }

  async update(tenantId: bigint, courtId: bigint, dto: UpdateCourtDto) {
    await this.findOne(tenantId, courtId);

    const court = await this.prisma.court.update({
      where: { id: courtId },
      data: dto,
    });

    return this.formatCourt(court);
  }

  private formatCourt(court: any) {
    return {
      id: court.id.toString(),
      tenant_id: court.tenantId.toString(),
      venue_id: court.venueId.toString(),
      code: court.code,
      type: court.type,
      base_price: court.basePrice?.toString(),
      status: court.status,
      created_at: court.createdAt.toISOString(),
    };
  }
}
