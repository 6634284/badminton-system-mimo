import { Module } from '@nestjs/common';
import { CoachService } from './coach.service';
import { CoachClientController } from './coach.controller.client';

@Module({
  providers: [CoachService],
  controllers: [CoachClientController],
  exports: [CoachService],
})
export class CoachClientModule {}
