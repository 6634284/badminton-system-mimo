import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { CreatePaymentDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';

@ApiTags('支付')
@ApiBearerAuth()
@Controller('/payments')
export class PaymentClientController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建支付订单' })
  async createPayment(@Body() dto: CreatePaymentDto, @Ctx() ctx: RequestContext) {
    return this.paymentService.createOrder(ctx.tenantId, ctx.userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: '我的支付记录' })
  async myPayments(@Query('page') page: number, @Query('pageSize') pageSize: number, @Ctx() ctx: RequestContext) {
    return this.paymentService.findAll(ctx.tenantId, { page, pageSize });
  }

  @Get('my-refunds')
  @ApiOperation({ summary: '我的退款记录' })
  async myRefunds(@Query('page') page: number, @Query('pageSize') pageSize: number, @Ctx() ctx: RequestContext) {
    return this.refundService.findByUser(ctx.tenantId, ctx.userId, page, pageSize);
  }
}
