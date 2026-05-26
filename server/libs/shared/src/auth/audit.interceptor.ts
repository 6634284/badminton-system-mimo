import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, tenantId, body } = request;

    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            await this.prisma.auditLog.create({
              data: {
                tenantId: tenantId || BigInt(0),
                operatorId: user?.userId || BigInt(0),
                operatorType: user?.roles?.includes('platform_admin') ? 'platform' : 'staff',
                category: this.extractCategory(url),
                action: `${method} ${url}`,
                riskLevel: this.assessRiskLevel(method, url),
                afterJson: responseData ? JSON.parse(JSON.stringify(responseData, (_, v) => typeof v === 'bigint' ? v.toString() : v)) : null,
                payload: body ? JSON.parse(JSON.stringify(body, (_, v) => typeof v === 'bigint' ? v.toString() : v)) : null,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
                traceId: request.traceId,
              },
            });
          } catch (error) {
            this.logger.error('Failed to write audit log', error);
          }
        },
        error: () => {},
      }),
    );
  }

  private extractCategory(url: string): string {
    const segments = url.split('/').filter(Boolean);
    return segments[2] || 'unknown'; // /api/{admin|client}/v1/{category}/...
  }

  private assessRiskLevel(method: string, url: string): number {
    if (url.includes('/payment') || url.includes('/wallet') || url.includes('/refund')) return 4;
    if (url.includes('/delete') || method === 'DELETE') return 3;
    if (method === 'PUT' || method === 'PATCH') return 2;
    return 1;
  }
}
