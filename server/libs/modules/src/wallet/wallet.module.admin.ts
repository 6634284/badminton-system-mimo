import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RechargeService } from './recharge.service';
import { WalletAdminController } from './wallet.controller.admin';

@Module({
  providers: [WalletService, RechargeService],
  controllers: [WalletAdminController],
  exports: [WalletService, RechargeService],
})
export class WalletAdminModule {}
