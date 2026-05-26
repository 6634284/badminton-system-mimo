import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { RegistrationService } from './registration.service';
import { ShareTokenService } from './share-token.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityClientController } from './activity.controller.client';
import { MemberClientModule } from '@app/modules/member/member.module.client';

@Module({
  imports: [MemberClientModule],
  providers: [ActivityService, RegistrationService, ShareTokenService, ActivityTemplateService],
  controllers: [ActivityClientController],
  exports: [ActivityService, RegistrationService, ShareTokenService, ActivityTemplateService],
})
export class ActivityClientModule {}
