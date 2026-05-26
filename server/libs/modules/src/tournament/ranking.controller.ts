import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('排名')
@ApiBearerAuth()
@Controller('')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('admin/v1/rankings/leaderboard')
  @RequirePermissions('tournament:list')
  @ApiOperation({ summary: '排行榜' })
  async leaderboard(@Query('limit') limit: string, @Ctx() ctx: RequestContext) {
    return this.rankingService.getLeaderboard(ctx.tenantId, Number(limit) || 50);
  }

  @Post('admin/v1/tournaments/:id/award-points')
  @RequirePermissions('tournament:update')
  @ApiOperation({ summary: '发放赛事积分' })
  async awardPoints(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.rankingService.awardTournamentPoints(ctx.tenantId, BigInt(id));
  }

  @Get('client/v1/rankings')
  @ApiOperation({ summary: '排行榜(客户端)' })
  async clientLeaderboard(@Query('limit') limit: string, @Ctx() ctx: RequestContext) {
    return this.rankingService.getLeaderboard(ctx.tenantId, Number(limit) || 50);
  }

  @Get('client/v1/rankings/my-history')
  @ApiOperation({ summary: '我的积分历史' })
  async myHistory(@Query('page') page: string, @Ctx() ctx: RequestContext) {
    return this.rankingService.getUserHistory(ctx.tenantId, ctx.userId, Number(page) || 1);
  }
}
