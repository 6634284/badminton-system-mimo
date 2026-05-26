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
import { ActivityService } from './activity.service';
import { RegistrationService } from './registration.service';
import { CreateActivityDto, UpdateActivityDto, ActivityQueryDto, RegistrationQueryDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('活动管理')
@ApiBearerAuth()
@Controller('')
export class ActivityAdminController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly registrationService: RegistrationService,
  ) {}

  @Post('activities')
  @RequirePermissions('activity:create')
  @ApiOperation({ summary: '创建活动' })
  async create(@Body() dto: CreateActivityDto, @Ctx() ctx: RequestContext) {
    return this.activityService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get('activities')
  @RequirePermissions('activity:list')
  @ApiOperation({ summary: '活动列表' })
  async findAll(@Query() query: ActivityQueryDto, @Ctx() ctx: RequestContext) {
    return this.activityService.findAll(ctx.tenantId, query);
  }

  @Get('activities/:id')
  @RequirePermissions('activity:detail')
  @ApiOperation({ summary: '活动详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.activityService.findOne(ctx.tenantId, BigInt(id));
  }

  @Patch('activities/:id')
  @RequirePermissions('activity:update')
  @ApiOperation({ summary: '更新活动' })
  async update(@Param('id') id: string, @Body() dto: UpdateActivityDto, @Ctx() ctx: RequestContext) {
    return this.activityService.update(ctx.tenantId, BigInt(id), dto);
  }

  @Post('activities/:id/publish')
  @RequirePermissions('activity:manage')
  @ApiOperation({ summary: '发布活动' })
  async publish(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.activityService.publish(ctx.tenantId, BigInt(id));
  }

  @Post('activities/:id/cancel')
  @RequirePermissions('activity:manage')
  @ApiOperation({ summary: '取消活动' })
  async cancel(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.activityService.cancel(ctx.tenantId, BigInt(id));
  }

  @Get('activities/:id/registrations')
  @RequirePermissions('activity:detail')
  @ApiOperation({ summary: '活动报名列表' })
  async getRegistrations(
    @Param('id') id: string,
    @Query() query: RegistrationQueryDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.registrationService.findByActivity(ctx.tenantId, BigInt(id), query);
  }

  @Post('registrations/:id/cancel')
  @RequirePermissions('registration:manage')
  @ApiOperation({ summary: '取消报名(管理)' })
  async cancelRegistration(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.registrationService.cancelByAdmin(ctx.tenantId, BigInt(id), reason);
  }

  @Get('registrations/:id')
  @RequirePermissions('registration:detail')
  @ApiOperation({ summary: '报名详情' })
  async getRegistration(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    const reg = await this.registrationService.findByActivity(ctx.tenantId, BigInt(0), {});
    return reg;
  }
}
