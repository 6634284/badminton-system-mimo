import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { RankingService } from './ranking.service';
import { TournamentClientController } from './tournament.controller.client';

@Module({
  providers: [TournamentService, RankingService],
  controllers: [TournamentClientController],
  exports: [TournamentService, RankingService],
})
export class TournamentClientModule {}
