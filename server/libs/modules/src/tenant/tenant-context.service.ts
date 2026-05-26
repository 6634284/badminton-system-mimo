import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateMembership(userId: bigint, tenantId: bigint): Promise<boolean> {
    const staff = await this.prisma.tenantStaff.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!staff || staff.status !== 'active' || staff.deletedAt) {
      return false;
    }

    return true;
  }

  async getStaffInfo(userId: bigint, tenantId: bigint) {
    const staff = await this.prisma.tenantStaff.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!staff || staff.status !== 'active' || staff.deletedAt) {
      throw new ForbiddenException('您不属于该场馆');
    }

    const [role, tenant] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: staff.roleId } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
    ]);

    return {
      staffId: staff.id.toString(),
      tenantId: staff.tenantId.toString(),
      userId: staff.userId.toString(),
      roleId: staff.roleId.toString(),
      roleCode: role?.code,
      roleName: role?.name,
      isOwner: staff.isOwner,
      tenantName: tenant?.name,
      tenantStatus: tenant?.status,
    };
  }

  async getUserTenants(userId: bigint) {
    const staffList = await this.prisma.tenantStaff.findMany({
      where: {
        userId,
        status: 'active',
        deletedAt: null,
      },
    });

    const tenantIds = staffList.map((s) => s.tenantId);
    const tenants = await this.prisma.tenant.findMany({
      where: {
        id: { in: tenantIds },
        status: 'active',
        deletedAt: null,
      },
    });

    const tenantMap = new Map(tenants.map((t) => [t.id.toString(), t]));

    return staffList
      .filter((s) => tenantMap.has(s.tenantId.toString()))
      .map((s) => {
        const t = tenantMap.get(s.tenantId.toString())!;
        return {
          tenant_id: t.id.toString(),
          name: t.name,
          logo_url: t.logoUrl,
          is_owner: s.isOwner,
          role_id: s.roleId.toString(),
        };
      });
  }
}
