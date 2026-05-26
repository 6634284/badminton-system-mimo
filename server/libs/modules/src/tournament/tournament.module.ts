import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { RankingService } from './ranking.service';
import { TournamentAdminController } from './tournament.controller.admin';
import { TournamentClientController } from './tournament.controller.client';
import { RankingController } from './ranking.controller';

@Module({
  providers: [TournamentService, RankingService],
  controllers: [TournamentAdminController, TournamentClientController, RankingController],
  exports: [TournamentService, RankingService],
})
export class TournamentModule {}
