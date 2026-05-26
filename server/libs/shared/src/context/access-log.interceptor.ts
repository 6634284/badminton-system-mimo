import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AccessLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log({
          method,
          url,
          status: context.switchToHttp().getResponse().statusCode,
          duration_ms: duration,
          trace_id: request.traceId,
          tenant_id: request.tenantId?.toString(),
          user_id: request.userId?.toString(),
        });
      }),
    );
  }
}
