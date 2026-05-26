import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationClientController } from './notification.controller.client';
import { NotificationAdminController } from './notification.controller.admin';

@Module({
  providers: [NotificationService],
  controllers: [NotificationClientController, NotificationAdminController],
  exports: [NotificationService],
})
export class NotificationModule {}
