import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@app/infra/prisma';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('审计日志')
@ApiBearerAuth()
@Controller('/audit-logs')
export class AuditLogAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit:list')
  @ApiOperation({ summary: '审计日志列表' })
  async findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('category') category: string,
    @Query('action') action: string,
    @Query('riskLevel') riskLevel: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Ctx() ctx: RequestContext,
  ) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const where: any = { tenantId: ctx.tenantId };

    if (category) where.category = category;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (riskLevel) where.riskLevel = Number(riskLevel);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      list: items.map((a) => ({
        id: a.id.toString(),
        operator_id: a.operatorId.toString(),
        operator_type: a.operatorType,
        category: a.category,
        action: a.action,
        target_type: a.targetType,
        target_id: a.targetId,
        risk_level: a.riskLevel,
        before_json: a.beforeJson,
        after_json: a.afterJson,
        payload: a.payload,
        ip: a.ip,
        trace_id: a.traceId,
        created_at: a.createdAt.toISOString(),
      })),
      total,
      page: p,
      pageSize: ps,
    };
  }
}
