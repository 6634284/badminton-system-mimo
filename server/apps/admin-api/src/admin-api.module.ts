import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from '@app/infra/prisma';
import { RedisModule } from '@app/infra/redis';
import { AuthModuleAdmin } from '@app/modules/auth/auth.module.admin';
import { TenantAdminModule } from '@app/modules/tenant/tenant.module.admin';
import { MemberAdminModule } from '@app/modules/member/member.module.admin';
import { VenueAdminModule } from '@app/modules/venue/venue.module.admin';
import { ActivityAdminModule } from '@app/modules/activity/activity.module.admin';
import { WalletAdminModule } from '@app/modules/wallet/wallet.module.admin';
import { PaymentAdminModule } from '@app/modules/payment/payment.module.admin';
import { ReportModule } from '@app/modules/report';
import { NotificationAdminModule } from '@app/modules/notification/notification.module.admin';
import { ExportModule } from '@app/modules/export';
import { MallAdminModule } from '@app/modules/mall/mall.module.admin';
import { TournamentAdminModule } from '@app/modules/tournament/tournament.module.admin';
import { CoachAdminModule } from '@app/modules/coach/coach.module.admin';
import { CouponAdminModule } from '@app/modules/coupon/coupon.module.admin';
import { CryptoModule } from '@app/shared/crypto';
import { JwtAuthGuard, TenantGuard, RateLimitGuard } from '@app/shared/auth';
import { AppExceptionFilter } from '@app/shared/errors';
import { TraceInterceptor, ResponseTransformInterceptor, AccessLogInterceptor, HealthController, SystemController } from '@app/shared/context';

@Module({
  imports: [PrismaModule, RedisModule, CryptoModule, AuthModuleAdmin, TenantAdminModule, MemberAdminModule, VenueAdminModule, ActivityAdminModule, WalletAdminModule, PaymentAdminModule, ReportModule, NotificationAdminModule, ExportModule, MallAdminModule, TournamentAdminModule, CoachAdminModule, CouponAdminModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: TraceInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
  controllers: [HealthController, SystemController],
})
export class AdminApiModule {}
