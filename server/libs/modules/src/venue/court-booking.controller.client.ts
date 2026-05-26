import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CourtBookingService } from './court-booking.service';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('场地预约')
@ApiBearerAuth()
@Controller('/court-bookings')
export class CourtBookingClientController {
  constructor(private readonly bookingService: CourtBookingService) {}

  @Get('slots')
  @ApiOperation({ summary: '查询可用时段' })
  async getSlots(@Query('courtId') courtId: string, @Query('date') date: string, @Ctx() ctx: RequestContext) {
    return this.bookingService.getAvailableSlots(ctx.tenantId, BigInt(courtId), date);
  }

  @Post()
  @ApiOperation({ summary: '预约场地' })
  async book(@Body() dto: { scheduleId: string; playerName?: string; phone?: string }, @Ctx() ctx: RequestContext) {
    return this.bookingService.book(ctx.tenantId, ctx.userId, dto);
  }

  @Delete(':scheduleId')
  @ApiOperation({ summary: '取消预约' })
  async cancel(@Param('scheduleId') scheduleId: string, @Ctx() ctx: RequestContext) {
    return this.bookingService.cancel(ctx.tenantId, ctx.userId, BigInt(scheduleId));
  }

  @Get('mine')
  @ApiOperation({ summary: '我的预约' })
  async myBookings(@Ctx() ctx: RequestContext) {
    return this.bookingService.getMyBookings(ctx.tenantId, ctx.userId);
  }
}
