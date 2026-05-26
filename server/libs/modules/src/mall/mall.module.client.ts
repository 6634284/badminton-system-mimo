import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { CartService } from './cart.service';
import { MallOrderService } from './mall-order.service';
import { MallClientController } from './mall.controller.client';

@Module({
  providers: [ProductService, CartService, MallOrderService],
  controllers: [MallClientController],
  exports: [ProductService, CartService, MallOrderService],
})
export class MallClientModule {}
