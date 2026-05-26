import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { MallOrderService } from './mall-order.service';
import { Ctx, RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('商城管理')
@ApiBearerAuth()
@Controller('/mall')
export class MallAdminController {
  constructor(
    private readonly productService: ProductService,
    private readonly orderService: MallOrderService,
  ) {}

  @Post('products')
  @RequirePermissions('mall:product:create')
  @ApiOperation({ summary: '创建商品' })
  async createProduct(@Body() dto: any, @Ctx() ctx: RequestContext) {
    return this.productService.create(ctx.tenantId, dto);
  }

  @Get('products')
  @RequirePermissions('mall:product:list')
  @ApiOperation({ summary: '商品列表' })
  async listProducts(@Query('page') page: string, @Query('pageSize') pageSize: string, @Query('status') status: string, @Ctx() ctx: RequestContext) {
    return this.productService.findAll(ctx.tenantId, Number(page) || 1, Number(pageSize) || 20, status);
  }

  @Patch('products/:id')
  @RequirePermissions('mall:product:update')
  @ApiOperation({ summary: '更新商品' })
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.productService.update(BigInt(id), dto);
  }

  @Patch('products/:id/status')
  @RequirePermissions('mall:product:update')
  @ApiOperation({ summary: '上下架' })
  async updateProductStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.productService.updateStatus(BigInt(id), status);
  }

  @Get('orders')
  @RequirePermissions('mall:order:list')
  @ApiOperation({ summary: '商城订单列表' })
  async listOrders(@Query('page') page: string, @Query('pageSize') pageSize: string, @Ctx() ctx: RequestContext) {
    return this.orderService.list(ctx.tenantId, 0n, Number(page) || 1, Number(pageSize) || 20);
  }

  @Patch('orders/:id/status')
  @RequirePermissions('mall:order:update')
  @ApiOperation({ summary: '更新订单状态' })
  async updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.orderService.updateStatus(BigInt(id), status);
  }
}
