import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityTemplateService } from './activity-template.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('活动模板')
@ApiBearerAuth()
@Controller('/activity-templates')
export class ActivityTemplateAdminController {
  constructor(private readonly templateService: ActivityTemplateService) {}

  @Post()
  @RequirePermissions('activity:create')
  @ApiOperation({ summary: '创建活动模板' })
  async create(@Body() dto: any, @Ctx() ctx: RequestContext) {
    return this.templateService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('activity:list')
  @ApiOperation({ summary: '模板列表' })
  async list(@Ctx() ctx: RequestContext) {
    return this.templateService.list(ctx.tenantId);
  }

  @Get(':id')
  @RequirePermissions('activity:detail')
  @ApiOperation({ summary: '模板详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.templateService.findOne(ctx.tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('activity:delete')
  @ApiOperation({ summary: '删除模板' })
  async delete(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.templateService.delete(ctx.tenantId, id);
  }

  @Post('batch-publish')
  @RequirePermissions('activity:create')
  @ApiOperation({ summary: '批量发布活动' })
  async batchPublish(@Body() dto: { templateId: string; dates: string[] }, @Ctx() ctx: RequestContext) {
    return this.templateService.batchPublish(ctx.tenantId, ctx.userId, dto);
  }
}
