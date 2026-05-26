import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RechargeService } from './recharge.service';
import { WalletAdminController } from './wallet.controller.admin';
import { WalletClientController } from './wallet.controller.client';

@Module({
  providers: [WalletService, RechargeService],
  controllers: [WalletAdminController, WalletClientController],
  exports: [WalletService, RechargeService],
})
export class WalletModule {}
