import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponAdminController } from './coupon.controller.admin';

@Module({
  providers: [CouponService],
  controllers: [CouponAdminController],
  exports: [CouponService],
})
export class CouponAdminModule {}
