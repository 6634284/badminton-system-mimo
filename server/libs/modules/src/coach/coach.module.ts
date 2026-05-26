import { Module } from '@nestjs/common';
import { CoachService } from './coach.service';
import { CoachAdminController } from './coach.controller.admin';
import { CoachClientController } from './coach.controller.client';

@Module({
  providers: [CoachService],
  controllers: [CoachAdminController, CoachClientController],
  exports: [CoachService],
})
export class CoachModule {}
