import { Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TournamentService } from './tournament.service';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('赛事')
@ApiBearerAuth()
@Controller('/tournaments')
export class TournamentClientController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  @ApiOperation({ summary: '赛事列表' })
  async list(@Query('page') page: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.findAll(ctx.tenantId, Number(page) || 1);
  }

  @Get(':id')
  @ApiOperation({ summary: '赛事详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.findOne(ctx.tenantId, BigInt(id));
  }

  @Post(':id/register')
  @ApiOperation({ summary: '报名参赛' })
  async register(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.register(ctx.tenantId, ctx.userId, 0n, BigInt(id));
  }

  @Delete(':id/register')
  @ApiOperation({ summary: '取消报名' })
  async cancelRegistration(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.cancelRegistration(ctx.tenantId, ctx.userId, BigInt(id));
  }

  @Get(':id/matches')
  @ApiOperation({ summary: '对阵表' })
  async getMatches(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.getMatches(ctx.tenantId, BigInt(id));
  }
}
