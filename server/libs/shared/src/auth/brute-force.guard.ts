import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@app/infra/redis';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 300; // 5 minutes
const ATTEMPT_WINDOW_SECONDS = 60; // 1 minute window

@Injectable()
export class BruteForceGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const body = request.body || {};
    const username = body.username || body.phone || 'unknown';

    // Check IP-based lockout
    const ipKey = `bruteforce:ip:${ip}`;
    const ipAttempts = await this.getAttempts(ipKey);
    if (ipAttempts >= MAX_ATTEMPTS * 3) {
      throw new HttpException('IP temporarily locked due to too many failed attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Check username-based lockout
    const userKey = `bruteforce:user:${username}`;
    const userAttempts = await this.getAttempts(userKey);
    if (userAttempts >= MAX_ATTEMPTS) {
      throw new HttpException('Account temporarily locked due to too many failed attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Store request info for recording failures
    request._bruteForceKeys = { ipKey, userKey };

    return true;
  }

  private async getAttempts(key: string): Promise<number> {
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Record a failed login attempt. Call this from the auth service on login failure.
   */
  async recordFailure(request: any): Promise<void> {
    const keys = request._bruteForceKeys;
    if (!keys) return;

    await this.incrementKey(keys.ipKey);
    await this.incrementKey(keys.userKey);
  }

  /**
   * Clear failed attempts on successful login.
   */
  async clearAttempts(request: any): Promise<void> {
    const keys = request._bruteForceKeys;
    if (!keys) return;

    await this.redis.del(keys.ipKey);
    await this.redis.del(keys.userKey);
  }

  private async incrementKey(key: string): Promise<void> {
    const current = await this.getAttempts(key);
    await this.redis.set(key, String(current + 1), LOCKOUT_SECONDS);
  }
}
