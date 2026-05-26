import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { RegistrationService } from './registration.service';
import { MemberService } from '@app/modules/member';
import { ActivityQueryDto, RegisterActivityDto, CancelRegistrationDto, RegistrationQueryDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';

@ApiTags('活动')
@ApiBearerAuth()
@Controller('')
export class ActivityClientController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly registrationService: RegistrationService,
    private readonly memberService: MemberService,
  ) {}

  @Get('activities')
  @ApiOperation({ summary: '活动列表' })
  async listActivities(@Query() query: ActivityQueryDto, @Ctx() ctx: RequestContext) {
    return this.activityService.findPublic(ctx.tenantId, query);
  }

  @Get('activities/:id')
  @ApiOperation({ summary: '活动详情' })
  async getActivity(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.activityService.findOne(ctx.tenantId, BigInt(id));
  }

  @Get('activities/:id/seats')
  @ApiOperation({ summary: '活动座位信息' })
  async getSeats(@Param('id') id: string) {
    return this.activityService.getSeatsInfo(BigInt(id));
  }

  @Post('registrations')
  @ApiOperation({ summary: '报名活动' })
  async register(@Body() dto: RegisterActivityDto, @Ctx() ctx: RequestContext) {
    // Ensure member exists for this tenant
    const memberId = await this.memberService.ensureMember(ctx.tenantId, ctx.userId);
    return this.registrationService.register(ctx.tenantId, ctx.userId, memberId, dto);
  }

  @Post('registrations/:id/cancel')
  @ApiOperation({ summary: '取消报名' })
  async cancelRegistration(
    @Param('id') id: string,
    @Body() dto: CancelRegistrationDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.registrationService.cancel(ctx.tenantId, BigInt(id), ctx.userId, dto);
  }

  @Get('registrations/me')
  @ApiOperation({ summary: '我的报名' })
  async myRegistrations(@Query() query: RegistrationQueryDto, @Ctx() ctx: RequestContext) {
    return this.registrationService.findByUser(ctx.tenantId, ctx.userId, query);
  }
}
