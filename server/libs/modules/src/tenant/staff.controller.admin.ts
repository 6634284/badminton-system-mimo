import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@app/infra/prisma';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('人员管理')
@ApiBearerAuth()
@Controller('/staffs')
export class StaffAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('staff:list')
  @ApiOperation({ summary: '人员列表' })
  async findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('keyword') keyword: string,
    @Ctx() ctx: RequestContext,
  ) {
    const where: any = { tenantId: ctx.tenantId, deletedAt: null };
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const skip = (p - 1) * ps;
    const take = ps;

    const [staffs, total] = await Promise.all([
      this.prisma.tenantStaff.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantStaff.count({ where }),
    ]);

    // Enrich with user info
    const userIds = staffs.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, phone: true },
    });
    const userMap = new Map(users.map((u) => [u.id.toString(), u]));

    // Enrich with role info
    const roleIds = staffs.map((s) => s.roleId).filter(Boolean);
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id.toString(), r]));

    const list = staffs.map((s) => {
      const user = userMap.get(s.userId.toString());
      const role = roleMap.get(s.roleId.toString());
      return {
        id: s.id.toString(),
        user_id: s.userId.toString(),
        username: user?.nickname || '-',
        phone: user?.phone || '-',
        role_id: s.roleId.toString(),
        role_name: role?.name || '-',
        is_owner: s.isOwner,
        status: s.status,
        joined_at: s.joinedAt.toISOString(),
      };
    });

    return { list, total, page: p, pageSize: ps };
  }

  @Post()
  @RequirePermissions('staff:create')
  @ApiOperation({ summary: '添加人员' })
  async create(@Body() dto: { userId: string; roleId: string }, @Ctx() ctx: RequestContext) {
    const existing = await this.prisma.tenantStaff.findUnique({
      where: {
        tenantId_userId: { tenantId: ctx.tenantId, userId: BigInt(dto.userId) },
      },
    });

    if (existing && !existing.deletedAt) {
      return { code: 40001, message: '该用户已是场馆人员' };
    }

    const staff = await this.prisma.tenantStaff.create({
      data: {
        tenantId: ctx.tenantId,
        userId: BigInt(dto.userId),
        roleId: BigInt(dto.roleId),
        status: 'active',
      },
    });

    return {
      id: staff.id.toString(),
      user_id: staff.userId.toString(),
      role_id: staff.roleId.toString(),
      status: staff.status,
    };
  }

  @Patch(':id/role')
  @RequirePermissions('staff:update')
  @ApiOperation({ summary: '更新角色' })
  async updateRole(@Param('id') id: string, @Body('roleId') roleId: string, @Ctx() ctx: RequestContext) {
    await this.prisma.tenantStaff.update({
      where: { id: BigInt(id) },
      data: { roleId: BigInt(roleId) },
    });
    return { success: true };
  }

  @Patch(':id/status')
  @RequirePermissions('staff:update')
  @ApiOperation({ summary: '更新状态' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Ctx() ctx: RequestContext) {
    await this.prisma.tenantStaff.update({
      where: { id: BigInt(id) },
      data: { status },
    });
    return { success: true };
  }
}
