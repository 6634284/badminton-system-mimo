import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@app/infra/prisma';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics' })
  async getStats(@Ctx() ctx: RequestContext) {
    const tenantId = ctx.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayActivities,
      activeMembers,
      todayRevenue,
      monthOrders,
      tournaments,
      mallOrders,
    ] = await Promise.all([
      this.prisma.activity.count({
        where: { tenantId, playDate: { gte: today }, deletedAt: null },
      }),
      this.prisma.member.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.paymentOrder.aggregate({
        where: { tenantId, status: 'paid', paidAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.paymentOrder.count({
        where: { tenantId, status: 'paid', paidAt: { gte: monthStart } },
      }),
      this.prisma.tournament.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.mallOrder.count({
        where: { tenantId, createdAt: { gte: monthStart }, deletedAt: null },
      }),
    ]);

    return {
      today_activities: todayActivities,
      active_members: activeMembers,
      today_revenue: todayRevenue?._sum?.amount ? Number(todayRevenue._sum.amount) : 0,
      month_orders: monthOrders,
      tournaments,
      mall_orders: mallOrders,
    };
  }
}
