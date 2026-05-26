import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@app/infra/prisma';
import { ForbiddenException } from '../errors';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    return target;
  };

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, tenantId, staffRole } = request;

    if (!user || !staffRole) {
      throw new ForbiddenException('无权限');
    }

    // Get role permissions
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId: staffRole.roleId },
    });

    const permIds = rolePerms.map((rp) => rp.permissionId);
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permIds } },
    });

    const userPermCodes = new Set(permissions.map((p) => p.code));

    const hasPermission = requiredPermissions.every((p) => userPermCodes.has(p));

    if (!hasPermission) {
      throw new ForbiddenException(`需要权限: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
