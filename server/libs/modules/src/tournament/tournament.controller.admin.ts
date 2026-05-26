import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TournamentService } from './tournament.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('赛事管理')
@ApiBearerAuth()
@Controller('/tournaments')
export class TournamentAdminController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @RequirePermissions('tournament:create')
  @ApiOperation({ summary: '创建赛事' })
  async create(@Body() dto: any, @Ctx() ctx: RequestContext) {
    return this.tournamentService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('tournament:list')
  @ApiOperation({ summary: '赛事列表' })
  async list(@Query('page') page: string, @Query('pageSize') pageSize: string, @Query('status') status: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.findAll(ctx.tenantId, Number(page) || 1, Number(pageSize) || 20, status);
  }

  @Get(':id')
  @RequirePermissions('tournament:detail')
  @ApiOperation({ summary: '赛事详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.findOne(ctx.tenantId, BigInt(id));
  }

  @Patch(':id/status')
  @RequirePermissions('tournament:update')
  @ApiOperation({ summary: '更新状态' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tournamentService.updateStatus(BigInt(id), status);
  }

  @Post(':id/bracket')
  @RequirePermissions('tournament:update')
  @ApiOperation({ summary: '生成对阵表' })
  async generateBracket(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.generateBracket(ctx.tenantId, BigInt(id));
  }

  @Get(':id/matches')
  @RequirePermissions('tournament:detail')
  @ApiOperation({ summary: '对阵列表' })
  async getMatches(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.tournamentService.getMatches(ctx.tenantId, BigInt(id));
  }

  @Patch('matches/:matchId/result')
  @RequirePermissions('tournament:update')
  @ApiOperation({ summary: '录入比赛结果' })
  async updateMatchResult(@Param('matchId') matchId: string, @Body() dto: { scoreText: string; winnerUserId: string }) {
    return this.tournamentService.updateMatchResult(BigInt(matchId), dto);
  }
}
