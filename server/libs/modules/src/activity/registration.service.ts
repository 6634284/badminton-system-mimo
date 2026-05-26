import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { RegisterActivityDto, CancelRegistrationDto, RegistrationQueryDto } from './dto';
import * as crypto from 'crypto';

const GRAB_SEAT_LUA = `
local seatKey = KEYS[1]
local joinKey = KEYS[2]
local capacity = tonumber(ARGV[1])
local slots = tonumber(ARGV[2]) or 1
local current = tonumber(redis.call('GET', joinKey) or '0')
if current + slots > capacity then
  return 0
end
redis.call('INCRBY', joinKey, slots)
return 1
`;

const RELEASE_SEAT_LUA = `
local joinKey = KEYS[1]
local slots = tonumber(ARGV[1]) or 1
local current = tonumber(redis.call('GET', joinKey) or '0')
local newVal = math.max(0, current - slots)
redis.call('SET', joinKey, newVal)
return newVal
`;

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async register(tenantId: bigint, userId: bigint, memberId: bigint, dto: RegisterActivityDto) {
    const activityId = BigInt(dto.activityId);
    const totalSlots = 1 + (dto.extraCount || 0);

    // 1. Validate activity state
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity || activity.tenantId !== tenantId || activity.deletedAt) {
      throw new NotFoundException('活动不存在');
    }

    if (!['published', 'registering'].includes(activity.status)) {
      throw new BadRequestException('活动不在报名状态');
    }

    // Check registration window
    const now = new Date();
    if (activity.registerOpenAt && now < activity.registerOpenAt) {
      throw new BadRequestException('报名尚未开始');
    }
    if (activity.registerCloseAt && now > activity.registerCloseAt) {
      throw new BadRequestException('报名已截止');
    }

    // 2. Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.activityRegistration.findFirst({
        where: { idempotencyKey: dto.idempotencyKey, tenantId },
      });
      if (existing) {
        return this.formatRegistration(existing);
      }
    }

    // 3. Check blacklist
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (member?.blacklisted) {
      throw new BadRequestException('您已被限制报名');
    }

    // 4. Check duplicate active registration
    const activeKey = `${tenantId}:${activityId}:${userId}`;
    const existingReg = await this.prisma.activityRegistration.findFirst({
      where: {
        activeUserKey: activeKey,
        status: { in: ['paying', 'confirmed'] },
        deletedAt: null,
      },
    });
    if (existingReg) {
      throw new ConflictException('您已报名该活动');
    }

    // 5. Redis Lua atomic seat grab
    const seatResult = await this.redis.eval(
      GRAB_SEAT_LUA,
      [`activity:${activityId}:seats`, `activity:${activityId}:join_count`],
      [activity.capacity.toString(), totalSlots.toString()],
    );

    if (seatResult === 0) {
      throw new BadRequestException('名额已满');
    }

    // 6. DB transaction
    try {
      const payAmount = Number(activity.price) * totalSlots;

      const registration = await this.prisma.$transaction(async (tx) => {
        // Insert registration
        const reg = await tx.activityRegistration.create({
          data: {
            tenantId,
            activityId,
            userId,
            memberId,
            isWaitlist: false,
            extraCount: dto.extraCount || 0,
            totalSlots,
            payAmount,
            status: 'paying',
            idempotencyKey: dto.idempotencyKey,
            activeUserKey: activeKey,
            shareToken: dto.shareToken,
          },
        });

        // Insert participants
        const participants = dto.participants || [{ displayName: member?.memberNo || 'self' }];
        for (let i = 0; i < participants.length; i++) {
          const p = participants[i];
          await tx.registrationParticipant.create({
            data: {
              tenantId,
              activityId,
              registrationId: reg.id,
              userId: i === 0 ? userId : undefined,
              displayName: p.displayName,
              phoneHash: p.phone ? crypto.createHash('sha256').update(p.phone).digest('hex') : undefined,
              seatNo: i + 1,
              status: 'confirmed',
            },
          });
        }

        // Update activity join count
        await tx.activity.update({
          where: { id: activityId },
          data: { joinCount: { increment: totalSlots } },
        });

        return reg;
      });

      this.logger.log(`Registration ${registration.id} created for activity ${activityId}`);
      return this.formatRegistration(registration);
    } catch (e) {
      // Release Redis seat on failure
      await this.redis.eval(
        RELEASE_SEAT_LUA,
        [`activity:${activityId}:join_count`],
        [totalSlots.toString()],
      );
      throw e;
    }
  }

  async cancel(tenantId: bigint, registrationId: bigint, userId: bigint, dto?: CancelRegistrationDto) {
    const registration = await this.prisma.activityRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration || registration.tenantId !== tenantId) {
      throw new NotFoundException('报名记录不存在');
    }

    if (registration.userId !== userId) {
      throw new BadRequestException('只能取消自己的报名');
    }

    if (!['paying', 'confirmed'].includes(registration.status)) {
      throw new BadRequestException('当前状态不可取消');
    }

    // Update registration and participants
    await this.prisma.$transaction(async (tx) => {
      await tx.activityRegistration.update({
        where: { id: registrationId },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.registrationParticipant.updateMany({
        where: { registrationId },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.activity.update({
        where: { id: registration.activityId },
        data: { joinCount: { decrement: registration.totalSlots } },
      });
    });

    // Release Redis seat
    await this.redis.eval(
      RELEASE_SEAT_LUA,
      [`activity:${registration.activityId}:join_count`],
      [registration.totalSlots.toString()],
    );

    // Trigger refund if registration was paid
    if (registration.status === 'confirmed' && registration.payOrderNo) {
      try {
        const payment = await this.prisma.paymentOrder.findFirst({
          where: { outTradeNo: registration.payOrderNo, status: 'paid' },
        });
        if (payment) {
          const { RefundService } = await import('../payment/refund.service');
          // Refund will be handled via the payment module's refund flow
          // Create a refund order for the paid amount
          const refundNo = `RF${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
          await this.prisma.refundOrder.create({
            data: {
              tenantId,
              userId,
              refundNo,
              paymentId: payment.id,
              bizType: 'activity',
              bizOrderNo: registration.id.toString(),
              refundAmount: registration.payAmount,
              status: 'pending',
            },
          });
          this.logger.log(`Refund ${refundNo} initiated for registration ${registrationId}`);
        }
      } catch (e) {
        this.logger.error(`Failed to initiate refund for registration ${registrationId}: ${e}`);
      }
    }

    this.logger.log(`Registration ${registrationId} canceled`);
    return { success: true };
  }

  async cancelByAdmin(tenantId: bigint, registrationId: bigint, reason?: string) {
    const registration = await this.prisma.activityRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration || registration.tenantId !== tenantId) {
      throw new NotFoundException('报名记录不存在');
    }

    if (!['paying', 'confirmed'].includes(registration.status)) {
      throw new BadRequestException('当前状态不可取消');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.activityRegistration.update({
        where: { id: registrationId },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.registrationParticipant.updateMany({
        where: { registrationId },
        data: { status: 'canceled', canceledAt: new Date() },
      });

      await tx.activity.update({
        where: { id: registration.activityId },
        data: { joinCount: { decrement: registration.totalSlots } },
      });
    });

    // Release Redis seat
    await this.redis.eval(
      RELEASE_SEAT_LUA,
      [`activity:${registration.activityId}:join_count`],
      [registration.totalSlots.toString()],
    );

    // Trigger refund if paid
    if (registration.status === 'confirmed' && registration.payOrderNo) {
      try {
        const payment = await this.prisma.paymentOrder.findFirst({
          where: { outTradeNo: registration.payOrderNo, status: 'paid' },
        });
        if (payment) {
          const refundNo = `RF${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
          await this.prisma.refundOrder.create({
            data: {
              tenantId,
              userId: registration.userId,
              refundNo,
              paymentId: payment.id,
              bizType: 'activity',
              bizOrderNo: registration.id.toString(),
              refundAmount: registration.payAmount,
              status: 'pending',
            },
          });
          this.logger.log(`Admin refund ${refundNo} initiated for registration ${registrationId}`);
        }
      } catch (e) {
        this.logger.error(`Failed to initiate refund for registration ${registrationId}: ${e}`);
      }
    }

    this.logger.log(`Registration ${registrationId} canceled by admin`);
    return { success: true };
  }

  async confirmPayment(registrationId: bigint) {
    const reg = await this.prisma.activityRegistration.update({
      where: { id: registrationId },
      data: { status: 'confirmed' },
    });

    this.logger.log(`Registration ${registrationId} payment confirmed`);
    return this.formatRegistration(reg);
  }

  async findByUser(tenantId: bigint, userId: bigint, query: RegistrationQueryDto) {
    const where: any = { tenantId, userId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [regs, total] = await Promise.all([
      this.prisma.activityRegistration.findMany({
        where,
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityRegistration.count({ where }),
    ]);

    return {
      list: regs.map((r) => this.formatRegistration(r)),
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  async findByActivity(tenantId: bigint, activityId: bigint, query: RegistrationQueryDto) {
    const where: any = { tenantId, activityId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [regs, total] = await Promise.all([
      this.prisma.activityRegistration.findMany({
        where,
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activityRegistration.count({ where }),
    ]);

    return {
      list: regs.map((r) => this.formatRegistration(r)),
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  private formatRegistration(r: any) {
    return {
      id: r.id.toString(),
      tenant_id: r.tenantId.toString(),
      activity_id: r.activityId.toString(),
      user_id: r.userId.toString(),
      member_id: r.memberId.toString(),
      is_waitlist: r.isWaitlist,
      extra_count: r.extraCount,
      total_slots: r.totalSlots,
      pay_amount: r.payAmount?.toString(),
      pay_method: r.payMethod,
      status: r.status,
      pay_order_no: r.payOrderNo,
      share_token: r.shareToken,
      canceled_at: r.canceledAt?.toISOString(),
      created_at: r.createdAt?.toISOString(),
    };
  }
}
