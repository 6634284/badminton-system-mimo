import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { RechargeService } from './recharge.service';
import { WalletQueryDto, TransactionQueryDto, CreateRechargePackageDto } from './dto';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';
import { RequirePermissions } from '@app/shared/auth';

@ApiTags('钱包管理')
@ApiBearerAuth()
@Controller('')
export class WalletAdminController {
  constructor(
    private readonly walletService: WalletService,
    private readonly rechargeService: RechargeService,
  ) {}

  @Get('wallets')
  @RequirePermissions('wallet:list')
  @ApiOperation({ summary: '钱包列表' })
  async listWallets(@Query() query: WalletQueryDto, @Ctx() ctx: RequestContext) {
    return this.walletService.listWallets(ctx.tenantId, query);
  }

  @Get('wallets/:userId/balance')
  @RequirePermissions('wallet:detail')
  @ApiOperation({ summary: '用户余额' })
  async getBalance(@Param('userId') userId: string, @Ctx() ctx: RequestContext) {
    return this.walletService.getBalance(ctx.tenantId, BigInt(userId));
  }

  @Get('wallets/:userId/transactions')
  @RequirePermissions('wallet:detail')
  @ApiOperation({ summary: '用户交易记录' })
  async getTransactions(
    @Param('userId') userId: string,
    @Query() query: TransactionQueryDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.walletService.getTransactions(ctx.tenantId, BigInt(userId), query);
  }

  @Get('recharge-packages')
  @RequirePermissions('recharge:manage')
  @ApiOperation({ summary: '充值套餐列表' })
  async getPackages(@Ctx() ctx: RequestContext) {
    return this.rechargeService.getPackages(ctx.tenantId);
  }

  @Post('recharge-packages')
  @RequirePermissions('recharge:manage')
  @ApiOperation({ summary: '创建充值套餐' })
  async createPackage(@Body() dto: CreateRechargePackageDto, @Ctx() ctx: RequestContext) {
    return this.rechargeService.createPackage(ctx.tenantId, dto);
  }
}
