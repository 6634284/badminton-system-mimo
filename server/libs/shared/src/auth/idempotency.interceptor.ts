import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '@app/infra/redis';

const IDEMPOTENCY_TTL = 60; // seconds

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    const tenantId = request.tenantId?.toString() || '0';
    const userId = request.user?.userId?.toString() || '0';
    const method = request.method;
    const path = request.route?.path || request.url;

    const redisKey = `idem:${tenantId}:${userId}:${method}:${path}:${idempotencyKey}`;

    // Check if already processed
    const cached = await this.redis.get(redisKey);
    if (cached) {
      this.logger.debug(`Idempotent request hit: ${redisKey}`);
      const result = JSON.parse(cached);
      return of(result);
    }

    // Mark as processing
    await this.redis.set(redisKey, JSON.stringify({ status: 'PROCESSING' }), IDEMPOTENCY_TTL);

    return next.handle().pipe(
      tap(async (data) => {
        // Cache the successful response
        await this.redis.set(redisKey, JSON.stringify(data), IDEMPOTENCY_TTL);
      }),
    );
  }
}
