import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { RankingService } from './ranking.service';
import { TournamentAdminController } from './tournament.controller.admin';
import { RankingController } from './ranking.controller';

@Module({
  providers: [TournamentService, RankingService],
  controllers: [TournamentAdminController, RankingController],
  exports: [TournamentService, RankingService],
})
export class TournamentAdminModule {}
