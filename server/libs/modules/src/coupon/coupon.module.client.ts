import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponClientController } from './coupon.controller.client';

@Module({
  providers: [CouponService],
  controllers: [CouponClientController],
  exports: [CouponService],
})
export class CouponClientModule {}
