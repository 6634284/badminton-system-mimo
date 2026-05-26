import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberImportService } from './member-import.service';
import { MemberAdminController } from './member.controller.admin';

@Module({
  providers: [MemberService, MemberImportService],
  controllers: [MemberAdminController],
  exports: [MemberService, MemberImportService],
})
export class MemberAdminModule {}
