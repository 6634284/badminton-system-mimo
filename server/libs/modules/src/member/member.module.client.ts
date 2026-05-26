import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberImportService } from './member-import.service';
import { MemberClientController } from './member.controller.client';

@Module({
  providers: [MemberService, MemberImportService],
  controllers: [MemberClientController],
  exports: [MemberService, MemberImportService],
})
export class MemberClientModule {}
