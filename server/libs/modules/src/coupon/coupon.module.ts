import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponAdminController } from './coupon.controller.admin';
import { CouponClientController } from './coupon.controller.client';

@Module({
  providers: [CouponService],
  controllers: [CouponAdminController, CouponClientController],
  exports: [CouponService],
})
export class CouponModule {}
