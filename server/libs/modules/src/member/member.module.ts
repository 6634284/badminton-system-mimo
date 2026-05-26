import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberImportService } from './member-import.service';
import { MemberAdminController } from './member.controller.admin';
import { MemberClientController } from './member.controller.client';

@Module({
  providers: [MemberService, MemberImportService],
  controllers: [MemberAdminController, MemberClientController],
  exports: [MemberService, MemberImportService],
})
export class MemberModule {}
