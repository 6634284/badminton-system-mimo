import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthClientController } from './auth.controller.client';
import { JwtStrategy } from '@app/shared/auth';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthClientController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModuleClient {}
