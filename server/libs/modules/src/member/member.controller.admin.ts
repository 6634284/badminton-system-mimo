import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { MemberImportService } from './member-import.service';
import { MemberQueryDto, UpdateMemberDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('会员管理')
@ApiBearerAuth()
@Controller('/members')
export class MemberAdminController {
  constructor(
    private readonly memberService: MemberService,
    private readonly memberImportService: MemberImportService,
  ) {}

  @Get()
  @RequirePermissions('member:list')
  @ApiOperation({ summary: '会员列表' })
  async findAll(@Query() query: MemberQueryDto, @Ctx() ctx: RequestContext) {
    return this.memberService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('member:detail')
  @ApiOperation({ summary: '会员详情' })
  async findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.memberService.findOne(ctx.tenantId, BigInt(id));
  }

  @Patch(':id')
  @RequirePermissions('member:update')
  @ApiOperation({ summary: '更新会员' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.memberService.update(ctx.tenantId, BigInt(id), dto);
  }

  @Get(':id/cards')
  @RequirePermissions('member:detail')
  @ApiOperation({ summary: '会员卡列表' })
  async getCards(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.memberService.getMemberCards(ctx.tenantId, BigInt(id));
  }

  @Post('import')
  @RequirePermissions('member:import')
  @ApiOperation({ summary: '批量导入会员' })
  async import(
    @Body() body: { rows: { phone: string; nickname?: string; level?: number; source?: string }[] },
    @Ctx() ctx: RequestContext,
  ) {
    return this.memberService.importMembers(ctx.tenantId, body.rows);
  }

  @Get('import/template')
  @ApiOperation({ summary: '获取导入模板' })
  async getImportTemplate() {
    return {
      headers: this.memberImportService.getTemplateHeaders(),
      sample: this.memberImportService.getTemplateSample(),
    };
  }

  @Get('import/status/:jobId')
  @ApiOperation({ summary: '查询导入进度' })
  async getImportStatus(@Param('jobId') jobId: string) {
    return this.memberImportService.getJobStatus(jobId);
  }
}
