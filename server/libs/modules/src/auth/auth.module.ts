import { Module } from '@nestjs/common';
import { AuthModuleAdmin } from './auth.module.admin';
import { AuthModuleClient } from './auth.module.client';

@Module({
  imports: [AuthModuleAdmin, AuthModuleClient],
  exports: [AuthModuleAdmin, AuthModuleClient],
})
export class AuthModule {}
