import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationAdminController } from './notification.controller.admin';

@Module({
  providers: [NotificationService],
  controllers: [NotificationAdminController],
  exports: [NotificationService],
})
export class NotificationAdminModule {}
