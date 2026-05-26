import { Module } from '@nestjs/common';
import { VenueService } from './venue.service';
import { CourtService } from './court.service';
import { CourtScheduleService } from './court-schedule.service';
import { CourtBookingService } from './court-booking.service';
import { VenueClientController } from './venue.controller.client';
import { CourtBookingClientController } from './court-booking.controller.client';

@Module({
  providers: [VenueService, CourtService, CourtScheduleService, CourtBookingService],
  controllers: [VenueClientController, CourtBookingClientController],
  exports: [VenueService, CourtService, CourtScheduleService, CourtBookingService],
})
export class VenueClientModule {}
