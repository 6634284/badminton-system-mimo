import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RechargeService } from './recharge.service';
import { WalletClientController } from './wallet.controller.client';

@Module({
  providers: [WalletService, RechargeService],
  controllers: [WalletClientController],
  exports: [WalletService, RechargeService],
})
export class WalletClientModule {}
