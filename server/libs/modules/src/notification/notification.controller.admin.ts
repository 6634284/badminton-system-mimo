import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('通知管理')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationAdminController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermissions('notification:list')
  @ApiOperation({ summary: '通知列表' })
  async list(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Ctx() ctx: RequestContext,
  ) {
    return this.notificationService.listForAdmin(ctx.tenantId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Post('send')
  @RequirePermissions('notification:send')
  @ApiOperation({ summary: '发送通知' })
  async send(
    @Body() dto: { userId: string; bizType: string; title: string; content: string },
    @Ctx() ctx: RequestContext,
  ) {
    return this.notificationService.send(ctx.tenantId, BigInt(dto.userId), dto);
  }

  @Post('bulk-send')
  @RequirePermissions('notification:send')
  @ApiOperation({ summary: '批量发送通知' })
  async bulkSend(
    @Body() dto: { userIds: string[]; bizType: string; title: string; content: string },
    @Ctx() ctx: RequestContext,
  ) {
    return this.notificationService.bulkSend(
      ctx.tenantId,
      dto.userIds.map((id) => BigInt(id)),
      dto,
    );
  }
}
