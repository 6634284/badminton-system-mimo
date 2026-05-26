import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('优惠券管理')
@ApiBearerAuth()
@Controller('/coupons')
export class CouponAdminController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @RequirePermissions('coupon:create')
  @ApiOperation({ summary: '创建优惠券' })
  async create(@Body() dto: any, @Ctx() ctx: RequestContext) {
    return this.couponService.create(ctx.tenantId, dto);
  }

  @Get()
  @RequirePermissions('coupon:list')
  @ApiOperation({ summary: '优惠券列表' })
  async list(@Query('page') page: string, @Query('pageSize') pageSize: string, @Ctx() ctx: RequestContext) {
    return this.couponService.findAll(ctx.tenantId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Patch(':id')
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: '更新优惠券' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.couponService.update(BigInt(id), dto);
  }

  @Patch(':id/status')
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: '更新状态' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.couponService.updateStatus(BigInt(id), status);
  }
}
