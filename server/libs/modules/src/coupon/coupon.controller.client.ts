import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('优惠券')
@ApiBearerAuth()
@Controller('/coupons')
export class CouponClientController {
  constructor(private readonly couponService: CouponService) {}

  @Post(':id/claim')
  @ApiOperation({ summary: '领取优惠券' })
  async claim(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.couponService.claim(ctx.tenantId, ctx.userId, BigInt(id));
  }

  @Get('mine')
  @ApiOperation({ summary: '我的优惠券' })
  async myCoupons(@Query('status') status: string, @Ctx() ctx: RequestContext) {
    return this.couponService.getUserCoupons(ctx.tenantId, ctx.userId, status);
  }
}
