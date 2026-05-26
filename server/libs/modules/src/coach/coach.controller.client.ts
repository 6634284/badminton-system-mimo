import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoachService } from './coach.service';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('教练')
@ApiBearerAuth()
@Controller('/coaches')
export class CoachClientController {
  constructor(private readonly coachService: CoachService) {}

  @Get()
  @ApiOperation({ summary: '教练列表' })
  async list(@Query('page') page: string, @Ctx() ctx: RequestContext) {
    return this.coachService.findAll(ctx.tenantId, Number(page) || 1);
  }

  @Get(':id')
  @ApiOperation({ summary: '教练详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.coachService.findOne(ctx.tenantId, BigInt(id));
  }

  @Get(':id/lessons')
  @ApiOperation({ summary: '教练课程' })
  async listLessons(@Param('id') id: string) {
    return this.coachService.listLessons(BigInt(id));
  }
}
