import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { PaymentAdminController } from './payment.controller.admin';
import { WalletAdminModule } from '@app/modules/wallet/wallet.module.admin';

@Module({
  imports: [WalletAdminModule],
  providers: [PaymentService, RefundService],
  controllers: [PaymentAdminController],
  exports: [PaymentService, RefundService],
})
export class PaymentAdminModule {}
