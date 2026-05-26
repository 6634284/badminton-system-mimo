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
import { VenueService } from './venue.service';
import { CourtService } from './court.service';
import { CourtScheduleService } from './court-schedule.service';
import {
  CreateVenueDto, UpdateVenueDto, VenueQueryDto,
  CreateCourtDto, UpdateCourtDto, CourtQueryDto,
  GenerateScheduleDto, ScheduleQueryDto,
} from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('场馆管理')
@ApiBearerAuth()
@Controller('')
export class VenueAdminController {
  constructor(
    private readonly venueService: VenueService,
    private readonly courtService: CourtService,
    private readonly courtScheduleService: CourtScheduleService,
  ) {}

  // ---- Venues ----

  @Post('venues')
  @RequirePermissions('venue:create')
  @ApiOperation({ summary: '创建场馆' })
  async createVenue(@Body() dto: CreateVenueDto, @Ctx() ctx: RequestContext) {
    return this.venueService.create(ctx.tenantId, dto);
  }

  @Get('venues')
  @RequirePermissions('venue:list')
  @ApiOperation({ summary: '场馆列表' })
  async listVenues(@Query() query: VenueQueryDto, @Ctx() ctx: RequestContext) {
    return this.venueService.findAll(ctx.tenantId, query);
  }

  @Get('venues/:id')
  @RequirePermissions('venue:detail')
  @ApiOperation({ summary: '场馆详情' })
  async getVenue(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.venueService.findOne(ctx.tenantId, BigInt(id));
  }

  @Patch('venues/:id')
  @RequirePermissions('venue:update')
  @ApiOperation({ summary: '更新场馆' })
  async updateVenue(@Param('id') id: string, @Body() dto: UpdateVenueDto, @Ctx() ctx: RequestContext) {
    return this.venueService.update(ctx.tenantId, BigInt(id), dto);
  }

  // ---- Courts ----

  @Post('courts')
  @RequirePermissions('court:create')
  @ApiOperation({ summary: '创建场地' })
  async createCourt(@Body() dto: CreateCourtDto, @Ctx() ctx: RequestContext) {
    return this.courtService.create(ctx.tenantId, dto);
  }

  @Get('courts')
  @RequirePermissions('court:list')
  @ApiOperation({ summary: '场地列表' })
  async listCourts(@Query() query: CourtQueryDto, @Ctx() ctx: RequestContext) {
    return this.courtService.findAll(ctx.tenantId, query);
  }

  @Get('courts/:id')
  @RequirePermissions('court:detail')
  @ApiOperation({ summary: '场地详情' })
  async getCourt(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.courtService.findOne(ctx.tenantId, BigInt(id));
  }

  @Patch('courts/:id')
  @RequirePermissions('court:update')
  @ApiOperation({ summary: '更新场地' })
  async updateCourt(@Param('id') id: string, @Body() dto: UpdateCourtDto, @Ctx() ctx: RequestContext) {
    return this.courtService.update(ctx.tenantId, BigInt(id), dto);
  }

  // ---- Schedules ----

  @Post('schedules/generate')
  @RequirePermissions('schedule:manage')
  @ApiOperation({ summary: '批量生成排期' })
  async generateSchedules(@Body() dto: GenerateScheduleDto, @Ctx() ctx: RequestContext) {
    return this.courtScheduleService.generate(ctx.tenantId, dto);
  }

  @Get('schedules')
  @RequirePermissions('schedule:list')
  @ApiOperation({ summary: '排期查询' })
  async getSchedules(@Query() query: ScheduleQueryDto, @Ctx() ctx: RequestContext) {
    return this.courtScheduleService.findByDate(ctx.tenantId, query);
  }

  @Post('schedules/:id/maintenance')
  @RequirePermissions('schedule:manage')
  @ApiOperation({ summary: '设置维护' })
  async setMaintenance(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.courtScheduleService.setMaintenance(ctx.tenantId, BigInt(id));
  }
}
