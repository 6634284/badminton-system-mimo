import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthAdminController } from './auth.controller.admin';
import { JwtStrategy } from '@app/shared/auth';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthAdminController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModuleAdmin {}
