import { Module } from '@nestjs/common';
import { CoachService } from './coach.service';
import { CoachAdminController } from './coach.controller.admin';

@Module({
  providers: [CoachService],
  controllers: [CoachAdminController],
  exports: [CoachService],
})
export class CoachAdminModule {}
