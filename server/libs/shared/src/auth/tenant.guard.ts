import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@app/infra/prisma';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ForbiddenException } from '../errors';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未认证');
    }

    // Platform admins can access any tenant (requires X-Tenant-Id header)
    const tenantIdHeader = request.headers['x-tenant-id'];

    if (user.roles?.includes('platform_admin')) {
      if (tenantIdHeader) {
        request.tenantId = BigInt(tenantIdHeader);
        this.logger.warn(`Platform admin ${user.userId} impersonating tenant ${tenantIdHeader}`);
        return true;
      }
      // Platform admin without tenant header - allow for platform-level endpoints
      request.tenantId = BigInt(0);
      return true;
    }

    // For regular users, resolve tenant from header or default
    if (!tenantIdHeader) {
      throw new ForbiddenException('缺少租户标识');
    }

    const tenantId = BigInt(tenantIdHeader);

    // Verify user belongs to this tenant
    const staff = await this.prisma.tenantStaff.findFirst({
      where: {
        tenantId,
        userId: user.userId,
        status: 'active',
        deletedAt: null,
      },
    });

    if (!staff) {
      this.logger.warn(`User ${user.userId} attempted to access tenant ${tenantId} without membership`);
      throw new ForbiddenException('无权访问该租户');
    }

    request.tenantId = tenantId;
    request.staffRole = staff;

    return true;
  }
}
