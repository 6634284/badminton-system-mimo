import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VenueService } from './venue.service';
import { CourtService } from './court.service';
import { CourtScheduleService } from './court-schedule.service';
import { ScheduleQueryDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';

@ApiTags('场馆')
@ApiBearerAuth()
@Controller('')
export class VenueClientController {
  constructor(
    private readonly venueService: VenueService,
    private readonly courtService: CourtService,
    private readonly courtScheduleService: CourtScheduleService,
  ) {}

  @Get('venues')
  @ApiOperation({ summary: '场馆列表' })
  async listVenues() {
    return this.venueService.findPublic();
  }

  @Get('venues/:id')
  @ApiOperation({ summary: '场馆详情' })
  async getVenue(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.venueService.findOne(ctx.tenantId, BigInt(id));
  }

  @Get('venues/:id/courts')
  @ApiOperation({ summary: '场馆场地列表' })
  async listCourts(@Param('id') id: string) {
    return this.courtService.findByVenue(BigInt(id));
  }

  @Get('venues/:id/schedules')
  @ApiOperation({ summary: '场馆排期' })
  async getSchedules(@Param('id') id: string, @Query('date') date: string, @Ctx() ctx: RequestContext) {
    return this.courtScheduleService.findByDate(ctx.tenantId, {
      venueId: parseInt(id, 10),
      date,
    });
  }
}
