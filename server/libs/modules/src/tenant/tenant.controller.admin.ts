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
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('场馆管理')
@ApiBearerAuth()
@Controller('/tenants')
export class TenantAdminController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @RequirePermissions('tenant:create')
  @ApiOperation({ summary: '创建场馆' })
  async create(@Body() dto: CreateTenantDto, @Ctx() ctx: RequestContext) {
    return this.tenantService.create(dto);
  }

  @Get()
  @RequirePermissions('tenant:list')
  @ApiOperation({ summary: '场馆列表' })
  async findAll(@Query() query: TenantQueryDto) {
    return this.tenantService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('tenant:detail')
  @ApiOperation({ summary: '场馆详情' })
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(BigInt(id));
  }

  @Patch(':id')
  @RequirePermissions('tenant:update')
  @ApiOperation({ summary: '更新场馆' })
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(BigInt(id), dto);
  }

  @Post(':id/approve')
  @RequirePermissions('tenant:approve')
  @ApiOperation({ summary: '审批通过' })
  async approve(@Param('id') id: string) {
    return this.tenantService.approve(BigInt(id));
  }

  @Post(':id/reject')
  @RequirePermissions('tenant:approve')
  @ApiOperation({ summary: '审批拒绝' })
  async reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.tenantService.reject(BigInt(id), reason);
  }

  @Post(':id/suspend')
  @RequirePermissions('tenant:update')
  @ApiOperation({ summary: '暂停场馆' })
  async suspend(@Param('id') id: string) {
    return this.tenantService.suspend(BigInt(id));
  }
}
