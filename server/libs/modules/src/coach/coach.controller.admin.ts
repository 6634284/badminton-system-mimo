import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoachService } from './coach.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('教练管理')
@ApiBearerAuth()
@Controller('/coaches')
export class CoachAdminController {
  constructor(private readonly coachService: CoachService) {}

  @Post()
  @RequirePermissions('coach:create')
  @ApiOperation({ summary: '创建教练' })
  async create(@Body() dto: any, @Ctx() ctx: RequestContext) {
    return this.coachService.create(ctx.tenantId, dto);
  }

  @Get()
  @RequirePermissions('coach:list')
  @ApiOperation({ summary: '教练列表' })
  async list(@Query('page') page: string, @Query('pageSize') pageSize: string, @Ctx() ctx: RequestContext) {
    return this.coachService.findAll(ctx.tenantId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Get(':id')
  @RequirePermissions('coach:detail')
  @ApiOperation({ summary: '教练详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.coachService.findOne(ctx.tenantId, BigInt(id));
  }

  @Patch(':id')
  @RequirePermissions('coach:update')
  @ApiOperation({ summary: '更新教练' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.coachService.update(BigInt(id), dto);
  }

  @Patch(':id/status')
  @RequirePermissions('coach:update')
  @ApiOperation({ summary: '更新状态' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.coachService.updateStatus(BigInt(id), status);
  }

  @Post(':id/lessons')
  @RequirePermissions('coach:update')
  @ApiOperation({ summary: '创建课程' })
  async createLesson(@Param('id') id: string, @Body() dto: any, @Ctx() ctx: RequestContext) {
    return this.coachService.createLesson(ctx.tenantId, BigInt(id), dto);
  }

  @Get(':id/lessons')
  @RequirePermissions('coach:detail')
  @ApiOperation({ summary: '课程列表' })
  async listLessons(@Param('id') id: string) {
    return this.coachService.listLessons(BigInt(id));
  }

  @Patch('lessons/:lessonId')
  @RequirePermissions('coach:update')
  @ApiOperation({ summary: '更新课程' })
  async updateLesson(@Param('lessonId') lessonId: string, @Body() dto: any) {
    return this.coachService.updateLesson(BigInt(lessonId), dto);
  }

  @Delete('lessons/:lessonId')
  @RequirePermissions('coach:update')
  @ApiOperation({ summary: '删除课程' })
  async deleteLesson(@Param('lessonId') lessonId: string) {
    return this.coachService.deleteLesson(BigInt(lessonId));
  }
}
