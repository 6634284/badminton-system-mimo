import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationClientController } from './notification.controller.client';

@Module({
  providers: [NotificationService],
  controllers: [NotificationClientController],
  exports: [NotificationService],
})
export class NotificationClientModule {}
