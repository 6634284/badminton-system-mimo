import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('场馆编码已存在');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        code: dto.code,
        name: dto.name,
        logoUrl: dto.logoUrl,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        licenseNo: dto.licenseNo,
        status: 'pending',
        plan: 'trial',
        settings: {},
      },
    });

    return this.formatTenant(tenant);
  }

  async findAll(query: TenantQueryDto) {
    const { status, keyword, page = 1, pageSize = 20 } = query;
    const where: any = { deletedAt: null };

    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { contactName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      list: tenants.map((t) => this.formatTenant(t)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: bigint) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('场馆不存在');
    }

    return this.formatTenant(tenant);
  }

  async update(id: bigint, dto: UpdateTenantDto) {
    await this.findOne(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        settings: undefined,
      },
    });

    return this.formatTenant(tenant);
  }

  async approve(id: bigint) {
    await this.findOne(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'active' },
    });

    this.logger.log(`Tenant ${id} approved`);
    return this.formatTenant(tenant);
  }

  async reject(id: bigint, reason?: string) {
    await this.findOne(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'rejected',
        settings: { rejectReason: reason },
      },
    });

    this.logger.log(`Tenant ${id} rejected: ${reason}`);
    return this.formatTenant(tenant);
  }

  async suspend(id: bigint) {
    await this.findOne(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'suspended' },
    });

    this.logger.log(`Tenant ${id} suspended`);
    return this.formatTenant(tenant);
  }

  async updateSettings(id: bigint, settings: Record<string, any>) {
    await this.findOne(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { settings },
    });

    return this.formatTenant(tenant);
  }

  private formatTenant(tenant: any) {
    return {
      id: tenant.id.toString(),
      code: tenant.code,
      name: tenant.name,
      logo_url: tenant.logoUrl,
      contact_name: tenant.contactName,
      contact_phone: tenant.contactPhone,
      license_no: tenant.licenseNo,
      status: tenant.status,
      plan: tenant.plan,
      plan_expired_at: tenant.planExpiredAt?.toISOString(),
      settings: tenant.settings,
      created_at: tenant.createdAt.toISOString(),
      updated_at: tenant.updatedAt.toISOString(),
    };
  }
}
