import { Module } from '@nestjs/common';
import { VenueService } from './venue.service';
import { CourtService } from './court.service';
import { CourtScheduleService } from './court-schedule.service';
import { CourtBookingService } from './court-booking.service';
import { VenueAdminController } from './venue.controller.admin';
import { CourtBookingAdminController } from './court-booking.controller.admin';

@Module({
  providers: [VenueService, CourtService, CourtScheduleService, CourtBookingService],
  controllers: [VenueAdminController, CourtBookingAdminController],
  exports: [VenueService, CourtService, CourtScheduleService, CourtBookingService],
})
export class VenueAdminModule {}
