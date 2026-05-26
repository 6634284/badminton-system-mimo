import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { RechargeService } from './recharge.service';
import { TransactionQueryDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';

@ApiTags('钱包')
@ApiBearerAuth()
@Controller('/wallet')
export class WalletClientController {
  constructor(
    private readonly walletService: WalletService,
    private readonly rechargeService: RechargeService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: '我的余额' })
  async getBalance(@Ctx() ctx: RequestContext) {
    return this.walletService.getBalance(ctx.tenantId, ctx.userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: '交易记录' })
  async getTransactions(@Query() query: TransactionQueryDto, @Ctx() ctx: RequestContext) {
    return this.walletService.getTransactions(ctx.tenantId, ctx.userId, query);
  }

  @Get('recharge-packages')
  @ApiOperation({ summary: '充值套餐' })
  async getPackages(@Ctx() ctx: RequestContext) {
    return this.rechargeService.getPackages(ctx.tenantId);
  }

  @Post('recharge')
  @ApiOperation({ summary: '发起充值' })
  async recharge(
    @Body() body: { packageId?: number; amount?: number },
    @Ctx() ctx: RequestContext,
  ) {
    return this.rechargeService.createOrder(
      ctx.tenantId,
      ctx.userId,
      body.packageId ? BigInt(body.packageId) : undefined,
      body.amount,
    );
  }

  @Get('recharge-orders')
  @ApiOperation({ summary: '充值记录' })
  async getRechargeOrders(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Ctx() ctx: RequestContext,
  ) {
    return this.rechargeService.getOrders(ctx.tenantId, ctx.userId, page, pageSize);
  }
}
