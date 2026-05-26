import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { RegistrationService } from './registration.service';
import { ShareTokenService } from './share-token.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityAdminController } from './activity.controller.admin';
import { ActivityClientController } from './activity.controller.client';
import { ActivityTemplateAdminController } from './activity-template.controller.admin';
import { MemberModule } from '@app/modules/member';

@Module({
  imports: [MemberModule],
  providers: [ActivityService, RegistrationService, ShareTokenService, ActivityTemplateService],
  controllers: [ActivityAdminController, ActivityClientController, ActivityTemplateAdminController],
  exports: [ActivityService, RegistrationService, ShareTokenService, ActivityTemplateService],
})
export class ActivityModule {}
