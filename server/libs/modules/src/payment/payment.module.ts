import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { PaymentAdminController } from './payment.controller.admin';
import { PaymentClientController } from './payment.controller.client';
import { WalletModule } from '@app/modules/wallet';

@Module({
  imports: [WalletModule],
  providers: [PaymentService, RefundService],
  controllers: [PaymentAdminController, PaymentClientController],
  exports: [PaymentService, RefundService],
})
export class PaymentModule {}
