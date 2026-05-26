import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { CartService } from './cart.service';
import { MallOrderService } from './mall-order.service';
import { MallAdminController } from './mall.controller.admin';

@Module({
  providers: [ProductService, CartService, MallOrderService],
  controllers: [MallAdminController],
  exports: [ProductService, CartService, MallOrderService],
})
export class MallAdminModule {}
