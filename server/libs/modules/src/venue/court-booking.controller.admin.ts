import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@app/infra/prisma';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('Admin Court Bookings')
@Controller('court-bookings')
export class CourtBookingAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all court bookings' })
  async list(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('status') status: string,
    @Ctx() ctx: RequestContext,
  ) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const where: any = { tenantId: ctx.tenantId, refType: 'private_booking', deletedAt: null };
    if (status) where.status = status;

    const [total, schedules] = await Promise.all([
      this.prisma.courtSchedule.count({ where }),
      this.prisma.courtSchedule.findMany({
        where,
        orderBy: [{ playDate: 'desc' }, { startTime: 'asc' }],
        skip: (p - 1) * ps,
        take: ps,
      }),
    ]);

    const courtIds = [...new Set(schedules.map(s => s.courtId))];
    const courts = await this.prisma.court.findMany({ where: { id: { in: courtIds } } });
    const courtMap = new Map(courts.map(c => [c.id.toString(), c]));

    const userIds = [...new Set(schedules.map(s => s.refId).filter((id): id is bigint => id !== null))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const userMap = new Map(users.map(u => [u.id.toString(), u]));

    return {
      total,
      list: schedules.map(s => {
        const court = courtMap.get(s.courtId.toString());
        const user = s.refId ? userMap.get(s.refId.toString()) : null;
        return {
          id: s.id.toString(),
          court_name: court?.code || '-',
          booking_date: s.playDate.toISOString().slice(0, 10),
          start_time: s.startTime.toISOString().slice(11, 16),
          end_time: s.endTime.toISOString().slice(11, 16),
          price: s.price.toString(),
          member_name: user?.nickname || '-',
          status: s.status,
        };
      }),
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a court booking (admin)' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Ctx() ctx: RequestContext) {
    const scheduleId = BigInt(id);
    const schedule = await this.prisma.courtSchedule.findFirst({ where: { id: scheduleId, tenantId: ctx.tenantId } });
    if (!schedule) throw new Error('预约不存在');
    if (schedule.status !== 'booked') throw new Error('只能取消已预约的时段');

    await this.prisma.courtSchedule.update({
      where: { id: scheduleId },
      data: { status: 'available', refType: null, refId: null },
    });

    return { success: true };
  }
}
