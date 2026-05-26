import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CartService } from './cart.service';
import { MallOrderService } from './mall-order.service';
import { Ctx, RequestContext } from '@app/shared/context';

@ApiTags('商城')
@ApiBearerAuth()
@Controller('/mall')
export class MallClientController {
  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly orderService: MallOrderService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: '商品列表' })
  async listProducts(@Query('page') page: string, @Ctx() ctx: RequestContext) {
    return this.productService.findAll(ctx.tenantId, Number(page) || 1);
  }

  @Get('products/:id')
  @ApiOperation({ summary: '商品详情' })
  async getProduct(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.productService.findOne(ctx.tenantId, BigInt(id));
  }

  @Post('cart')
  @ApiOperation({ summary: '加入购物车' })
  async addToCart(@Body() dto: { skuId: string; quantity: number }, @Ctx() ctx: RequestContext) {
    return this.cartService.add(ctx.tenantId, ctx.userId, dto);
  }

  @Get('cart')
  @ApiOperation({ summary: '购物车列表' })
  async listCart(@Ctx() ctx: RequestContext) {
    return this.cartService.list(ctx.tenantId, ctx.userId);
  }

  @Patch('cart/:id')
  @ApiOperation({ summary: '更新数量' })
  async updateCart(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.cartService.updateQuantity(BigInt(id), quantity);
  }

  @Delete('cart/:id')
  @ApiOperation({ summary: '删除购物车项' })
  async removeFromCart(@Param('id') id: string) {
    return this.cartService.remove(BigInt(id));
  }

  @Post('orders')
  @ApiOperation({ summary: '创建订单' })
  async createOrder(@Body() dto: { items: { skuId: string; quantity: number }[]; address?: string; remark?: string }, @Ctx() ctx: RequestContext) {
    return this.orderService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: '我的订单' })
  async listOrders(@Query('page') page: string, @Ctx() ctx: RequestContext) {
    return this.orderService.list(ctx.tenantId, ctx.userId, Number(page) || 1);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '订单详情' })
  async getOrder(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.orderService.findOne(ctx.tenantId, BigInt(id));
  }
}
