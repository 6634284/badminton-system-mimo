import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from '@app/infra/redis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const userId = request.user?.sub || 'anonymous';
    const path = request.route?.path || request.path;

    // Global rate limit: 100 requests per minute per IP
    const ipKey = `ratelimit:ip:${ip}`;
    const ipCount = await this.increment(ipKey, 60);
    if (ipCount > 100) {
      throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Per-user rate limit: 60 requests per minute for authenticated users
    if (userId !== 'anonymous') {
      const userKey = `ratelimit:user:${userId}`;
      const userCount = await this.increment(userKey, 60);
      if (userCount > 60) {
        throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    // Write endpoint stricter limit: 20 per minute per user
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && userId !== 'anonymous') {
      const writeKey = `ratelimit:write:${userId}`;
      const writeCount = await this.increment(writeKey, 60);
      if (writeCount > 20) {
        throw new HttpException('操作过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    return true;
  }

  private async increment(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }
}
