import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { AuthModuleClient } from '@app/modules/auth/auth.module.client';
import { TenantClientModule } from '@app/modules/tenant/tenant.module.client';
import { MemberClientModule } from '@app/modules/member/member.module.client';
import { VenueClientModule } from '@app/modules/venue/venue.module.client';
import { ActivityClientModule } from '@app/modules/activity/activity.module.client';
import { WalletClientModule } from '@app/modules/wallet/wallet.module.client';
import { PaymentClientModule } from '@app/modules/payment/payment.module.client';
import { NotificationClientModule } from '@app/modules/notification/notification.module.client';
import { MallClientModule } from '@app/modules/mall/mall.module.client';
import { TournamentClientModule } from '@app/modules/tournament/tournament.module.client';
import { CoachClientModule } from '@app/modules/coach/coach.module.client';
import { CouponClientModule } from '@app/modules/coupon/coupon.module.client';
import { CryptoModule } from '@app/shared/crypto';
import { JwtAuthGuard, TenantGuard, RateLimitGuard } from '@app/shared/auth';
import { AppExceptionFilter } from '@app/shared/errors';
import { TraceInterceptor, ResponseTransformInterceptor, AccessLogInterceptor, HealthController } from '@app/shared/context';

@Module({
  imports: [PrismaModule, RedisModule, CryptoModule, AuthModuleClient, TenantClientModule, MemberClientModule, VenueClientModule, ActivityClientModule, WalletClientModule, PaymentClientModule, NotificationClientModule, MallClientModule, TournamentClientModule, CoachClientModule, CouponClientModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: TraceInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
  controllers: [HealthController],
})
export class ClientApiModule {}
