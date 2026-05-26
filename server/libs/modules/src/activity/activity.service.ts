import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { CreateActivityDto, UpdateActivityDto, ActivityQueryDto } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(tenantId: bigint, userId: bigint, dto: CreateActivityDto) {
    const activity = await this.prisma.activity.create({
      data: {
        tenantId,
        venueId: BigInt(dto.venueId),
        type: dto.type,
        title: dto.title,
        coverUrl: dto.coverUrl,
        playDate: new Date(dto.playDate),
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        capacity: dto.capacity,
        joinCount: 0,
        waitlistCount: 0,
        price: dto.price,
        memberPrice: dto.memberPrice,
        cancelPolicy: dto.cancelPolicy || {},
        status: 'draft',
        registerOpenAt: dto.registerOpenAt ? new Date(dto.registerOpenAt) : undefined,
        registerCloseAt: dto.registerCloseAt ? new Date(dto.registerCloseAt) : undefined,
        createdBy: userId,
      },
    });

    // Link court schedules
    if (dto.scheduleIds?.length) {
      await this.prisma.activityCourt.createMany({
        data: dto.scheduleIds.map((sid) => ({
          activityId: activity.id,
          scheduleId: BigInt(sid),
        })),
      });
    }

    // Initialize Redis seat counter
    await this.redis.set(`activity:${activity.id}:seats`, dto.capacity.toString());
    await this.redis.set(`activity:${activity.id}:join_count`, '0');

    return this.formatActivity(activity);
  }

  async findAll(tenantId: bigint, query: ActivityQueryDto) {
    const { status, type, date, keyword, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId, deletedAt: null };

    if (status) where.status = status;
    if (type) where.type = type;
    if (date) {
      const d = new Date(date);
      where.playDate = d;
    }
    if (keyword) {
      where.title = { contains: keyword, mode: 'insensitive' };
    }

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ playDate: 'asc' }, { startAt: 'asc' }],
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      list: activities.map((a) => this.formatActivity(a)),
      total,
      page,
      pageSize,
    };
  }

  async findPublic(tenantId: bigint, query: ActivityQueryDto) {
    const where: any = {
      tenantId,
      status: { in: ['published', 'registering', 'full'] },
      deletedAt: null,
    };

    if (query.type) where.type = query.type;
    if (query.date) where.playDate = new Date(query.date);

    const activities = await this.prisma.activity.findMany({
      where,
      skip: ((query.page || 1) - 1) * (query.pageSize || 20),
      take: query.pageSize || 20,
      orderBy: [{ playDate: 'asc' }, { startAt: 'asc' }],
    });

    return activities.map((a) => this.formatActivity(a));
  }

  async findOne(tenantId: bigint, activityId: bigint) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity || activity.tenantId !== tenantId || activity.deletedAt) {
      throw new NotFoundException('活动不存在');
    }

    // Get current seat count from Redis
    const joinCount = await this.redis.get(`activity:${activity.id}:join_count`);

    return {
      ...this.formatActivity(activity),
      current_join_count: joinCount ? parseInt(joinCount, 10) : activity.joinCount,
    };
  }

  async publish(tenantId: bigint, activityId: bigint) {
    const activity = await this.findOne(tenantId, activityId);

    if (activity.status !== 'draft') {
      throw new BadRequestException('只有草稿状态的活动可以发布');
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: { status: 'published' },
    });

    return this.formatActivity(updated);
  }

  async cancel(tenantId: bigint, activityId: bigint) {
    const activity = await this.findOne(tenantId, activityId);

    if (['finished', 'settled', 'canceled'].includes(activity.status)) {
      throw new BadRequestException('该状态的活动不可取消');
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: { status: 'canceled' },
    });

    // Bulk refund all confirmed registrations
    await this.refundAllRegistrations(tenantId, activityId);

    return this.formatActivity(updated);
  }

  private async refundAllRegistrations(tenantId: bigint, activityId: bigint) {
    const registrations = await this.prisma.activityRegistration.findMany({
      where: {
        tenantId,
        activityId,
        status: 'confirmed',
        deletedAt: null,
      },
    });

    for (const reg of registrations) {
      try {
        if (reg.payOrderNo) {
          const payment = await this.prisma.paymentOrder.findFirst({
            where: { outTradeNo: reg.payOrderNo, status: 'paid' },
          });
          if (payment) {
            const refundNo = `RF${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
            await this.prisma.refundOrder.create({
              data: {
                tenantId,
                userId: reg.userId,
                refundNo,
                paymentId: payment.id,
                bizType: 'activity',
                bizOrderNo: reg.id.toString(),
                refundAmount: reg.payAmount,
                status: 'pending',
              },
            });
            this.logger.log(`Refund ${refundNo} initiated for registration ${reg.id} (activity cancel)`);
          }
        }

        // Update registration status
        await this.prisma.activityRegistration.update({
          where: { id: reg.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });

        // Update participants
        await this.prisma.registrationParticipant.updateMany({
          where: { registrationId: reg.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });
      } catch (e) {
        this.logger.error(`Failed to refund registration ${reg.id}: ${e}`);
      }
    }

    // Reset Redis seat counter
    await this.redis.set(`activity:${activityId}:join_count`, '0');

    this.logger.log(`Activity ${activityId} canceled, ${registrations.length} registrations refunded`);
  }

  async update(tenantId: bigint, activityId: bigint, dto: UpdateActivityDto) {
    await this.findOne(tenantId, activityId);

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        title: dto.title,
        coverUrl: dto.coverUrl,
        capacity: dto.capacity,
        price: dto.price,
        memberPrice: dto.memberPrice,
        cancelPolicy: dto.cancelPolicy,
      },
    });

    // Update Redis capacity if changed
    if (dto.capacity !== undefined) {
      await this.redis.set(`activity:${activityId}:seats`, dto.capacity.toString());
    }

    return this.formatActivity(updated);
  }

  async getSeatsInfo(activityId: bigint) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) throw new NotFoundException('活动不存在');

    const joinCount = await this.redis.get(`activity:${activityId}:join_count`);
    const current = joinCount ? parseInt(joinCount, 10) : activity.joinCount;

    return {
      activity_id: activityId.toString(),
      capacity: activity.capacity,
      join_count: current,
      remaining: Math.max(0, activity.capacity - current),
      is_full: current >= activity.capacity,
    };
  }

  private formatActivity(a: any) {
    return {
      id: a.id.toString(),
      tenant_id: a.tenantId.toString(),
      venue_id: a.venueId.toString(),
      type: a.type,
      title: a.title,
      cover_url: a.coverUrl,
      play_date: a.playDate?.toISOString().split('T')[0],
      start_at: a.startAt?.toISOString(),
      end_at: a.endAt?.toISOString(),
      capacity: a.capacity,
      join_count: a.joinCount,
      waitlist_count: a.waitlistCount,
      price: a.price?.toString(),
      member_price: a.memberPrice?.toString(),
      cancel_policy: a.cancelPolicy,
      status: a.status,
      register_open_at: a.registerOpenAt?.toISOString(),
      register_close_at: a.registerCloseAt?.toISOString(),
      created_by: a.createdBy?.toString(),
      created_at: a.createdAt?.toISOString(),
    };
  }
}
