import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('数据导出')
@ApiBearerAuth()
@Controller('/exports')
export class ExportAdminController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @RequirePermissions('export:create')
  @ApiOperation({ summary: '创建导出任务' })
  async createExport(
    @Body() dto: { type: string; format?: string; filters?: Record<string, any> },
    @Ctx() ctx: RequestContext,
  ) {
    return this.exportService.createExport(ctx.tenantId, ctx.userId, dto);
  }

  @Get(':jobId/status')
  @RequirePermissions('export:list')
  @ApiOperation({ summary: '查询导出状态' })
  async getStatus(@Param('jobId') jobId: string) {
    return this.exportService.getStatus(jobId);
  }

  @Get(':jobId/download')
  @RequirePermissions('export:list')
  @ApiOperation({ summary: '下载导出文件' })
  async download(@Param('jobId') jobId: string, @Res() res: any) {
    const status = await this.exportService.getStatus(jobId);
    if (status.status !== 'completed') {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: '导出未完成' });
    }

    const csv = await this.exportService.getResult(jobId);
    if (!csv) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: '导出文件已过期' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${jobId}.csv"`);
    res.send('﻿' + csv); // BOM for Excel Chinese support
  }
}
