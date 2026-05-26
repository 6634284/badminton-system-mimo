import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { RegistrationService } from './registration.service';
import { ShareTokenService } from './share-token.service';
import { ActivityTemplateService } from './activity-template.service';
import { ActivityAdminController } from './activity.controller.admin';
import { ActivityTemplateAdminController } from './activity-template.controller.admin';
import { MemberAdminModule } from '@app/modules/member/member.module.admin';

@Module({
  imports: [MemberAdminModule],
  providers: [ActivityService, RegistrationService, ShareTokenService, ActivityTemplateService],
  controllers: [ActivityAdminController, ActivityTemplateAdminController],
  exports: [ActivityService, RegistrationService, ShareTokenService, ActivityTemplateService],
})
export class ActivityAdminModule {}
