import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('通知')
@ApiBearerAuth()
@Controller('/notifications')
export class NotificationClientController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '我的通知列表' })
  async list(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('unreadOnly') unreadOnly: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.notificationService.findByUser(
      ctx.tenantId,
      ctx.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
      unreadOnly === 'true',
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记已读' })
  async markRead(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    await this.notificationService.markRead(BigInt(id), ctx.userId);
    return { success: true };
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部已读' })
  async markAllRead(@Ctx() ctx: RequestContext) {
    const result = await this.notificationService.markAllRead(ctx.tenantId, ctx.userId);
    return result;
  }
}
