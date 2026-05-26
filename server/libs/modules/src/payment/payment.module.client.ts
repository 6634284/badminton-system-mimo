import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { PaymentClientController } from './payment.controller.client';
import { WalletClientModule } from '@app/modules/wallet/wallet.module.client';

@Module({
  imports: [WalletClientModule],
  providers: [PaymentService, RefundService],
  controllers: [PaymentClientController],
  exports: [PaymentService, RefundService],
})
export class PaymentClientModule {}
