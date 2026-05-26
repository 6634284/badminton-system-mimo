import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { CreateVenueDto, UpdateVenueDto, VenueQueryDto } from './dto';

@Injectable()
export class VenueService {
  private readonly logger = new Logger(VenueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, dto: CreateVenueDto) {
    const venue = await this.prisma.venue.create({
      data: {
        tenantId,
        name: dto.name,
        city: dto.city,
        district: dto.district,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        partnerId: dto.partnerId ? BigInt(dto.partnerId) : undefined,
        status: 'active',
        openRules: {},
      },
    });

    return this.formatVenue(venue);
  }

  async findAll(tenantId: bigint, query: VenueQueryDto) {
    const { keyword, status, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId, deletedAt: null };

    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { address: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      list: venues.map((v) => this.formatVenue(v)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(tenantId: bigint, venueId: bigint) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });

    if (!venue || venue.tenantId !== tenantId || venue.deletedAt) {
      throw new NotFoundException('场馆不存在');
    }

    return this.formatVenue(venue);
  }

  async findPublic() {
    const venues = await this.prisma.venue.findMany({
      where: { status: 'active', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return venues.map((v) => this.formatVenue(v));
  }

  async update(tenantId: bigint, venueId: bigint, dto: UpdateVenueDto) {
    await this.findOne(tenantId, venueId);

    const venue = await this.prisma.venue.update({
      where: { id: venueId },
      data: dto,
    });

    return this.formatVenue(venue);
  }

  private formatVenue(venue: any) {
    return {
      id: venue.id.toString(),
      tenant_id: venue.tenantId.toString(),
      partner_id: venue.partnerId?.toString(),
      name: venue.name,
      city: venue.city,
      district: venue.district,
      address: venue.address,
      latitude: venue.latitude?.toString(),
      longitude: venue.longitude?.toString(),
      status: venue.status,
      open_rules: venue.openRules,
      created_at: venue.createdAt.toISOString(),
    };
  }
}
