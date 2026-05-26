import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@app/shared/auth';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'error';
      healthy = false;
    }

    try {
      await this.redis.get('health:ping');
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      healthy = false;
    }

    return {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiExcludeEndpoint()
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not_ready' };
    }
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiExcludeEndpoint()
  async live() {
    return { status: 'alive', uptime: process.uptime() };
  }
}

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Detailed system health' })
  async getHealth() {
    const services: Record<string, { status: string; latency?: number }> = {};

    // PostgreSQL
    const pgStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.postgresql = { status: 'healthy', latency: Date.now() - pgStart };
    } catch {
      services.postgresql = { status: 'down', latency: Date.now() - pgStart };
    }

    // Redis
    const redisStart = Date.now();
    try {
      await this.redis.ping();
      services.redis = { status: 'healthy', latency: Date.now() - redisStart };
    } catch {
      services.redis = { status: 'down', latency: Date.now() - redisStart };
    }

    const allHealthy = Object.values(services).every(s => s.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      uptime: Math.floor(process.uptime()),
      node_version: process.version,
      memory: {
        heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      services,
    };
  }

  @Public()
  @Get('queues')
  @ApiOperation({ summary: 'Queue status' })
  async getQueues() {
    // Placeholder - in production this would connect to BullMQ
    return [
      { name: 'outbox-relay', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      { name: 'notification', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      { name: 'schedule-gen', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      { name: 'order-timeout', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      { name: 'waitlist-promote', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    ];
  }
}
