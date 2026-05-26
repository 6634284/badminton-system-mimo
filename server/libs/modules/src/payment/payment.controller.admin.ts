import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { RefundDto, PaymentQueryDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('支付管理')
@ApiBearerAuth()
@Controller('')
export class PaymentAdminController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
  ) {}

  @Get('payments')
  @RequirePermissions('payment:list')
  @ApiOperation({ summary: '支付订单列表' })
  async listPayments(@Query() query: PaymentQueryDto, @Ctx() ctx: RequestContext) {
    return this.paymentService.findAll(ctx.tenantId, query);
  }

  @Get('payments/:id')
  @RequirePermissions('payment:detail')
  @ApiOperation({ summary: '支付订单详情' })
  async getPayment(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.paymentService.findOne(ctx.tenantId, BigInt(id));
  }

  @Post('refunds')
  @RequirePermissions('refund:create')
  @ApiOperation({ summary: '创建退款' })
  async createRefund(@Body() dto: RefundDto, @Ctx() ctx: RequestContext) {
    return this.refundService.createRefund(ctx.tenantId, ctx.userId, dto);
  }

  @Get('refunds')
  @RequirePermissions('refund:list')
  @ApiOperation({ summary: '退款列表' })
  async listRefunds(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Ctx() ctx: RequestContext,
  ) {
    return this.refundService.findAll(ctx.tenantId, page, pageSize);
  }
}
