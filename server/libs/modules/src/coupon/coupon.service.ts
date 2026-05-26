import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, dto: any) {
    return this.prisma.coupon.create({
      data: {
        tenantId, name: dto.name, type: dto.type, discountValue: dto.discountValue,
        applyScope: dto.applyScope, applyTargetId: dto.applyTargetId ? BigInt(dto.applyTargetId) : null,
        stock: dto.stock, perUserLimit: dto.perUserLimit || 1,
        validType: dto.validType, validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null, validDays: dto.validDays, status: 'active',
      },
    });
  }

  async findAll(tenantId: bigint, page = 1, pageSize = 20) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.coupon.count({ where }),
    ]);
    return { list: items.map((c) => this.format(c)), total, page, pageSize };
  }

  async update(id: bigint, dto: any) {
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async updateStatus(id: bigint, status: string) {
    return this.prisma.coupon.update({ where: { id }, data: { status } });
  }

  async claim(tenantId: bigint, userId: bigint, couponId: bigint) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id: couponId, tenantId, status: 'active' } });
    if (!coupon) throw new NotFoundException('优惠券不存在');
    if (coupon.stock <= 0) throw new BadRequestException('优惠券已领完');

    const claimed = await this.prisma.userCoupon.count({ where: { tenantId, userId, couponId, status: { not: 'expired' } } });
    if (claimed >= coupon.perUserLimit) throw new BadRequestException('已达到领取上限');

    let validFrom = coupon.validFrom;
    let validTo = coupon.validTo;
    if (coupon.validType === 2 && coupon.validDays) {
      validFrom = new Date();
      validTo = new Date(Date.now() + coupon.validDays * 86400000);
    }

    const userCoupon = await this.prisma.userCoupon.create({
      data: { tenantId, userId, couponId, status: 'unused', validFrom, validTo },
    });
    await this.prisma.coupon.update({ where: { id: couponId }, data: { stock: { decrement: 1 } } });

    this.logger.log(`Coupon ${couponId} claimed by user ${userId}`);
    return this.formatUserCoupon(userCoupon);
  }

  async getUserCoupons(tenantId: bigint, userId: bigint, status?: string) {
    const where: any = { tenantId, userId };
    if (status) where.status = status;
    const items = await this.prisma.userCoupon.findMany({ where, orderBy: { receivedAt: 'desc' } });

    // Enrich with coupon info
    const couponIds = [...new Set(items.map((uc) => uc.couponId))];
    const coupons = await this.prisma.coupon.findMany({ where: { id: { in: couponIds } } });
    const couponMap = new Map(coupons.map((c) => [c.id.toString(), c]));

    return items.map((uc) => {
      const coupon = couponMap.get(uc.couponId.toString());
      return {
        ...this.formatUserCoupon(uc),
        coupon_name: coupon?.name, coupon_type: coupon?.type,
        discount_value: coupon?.discountValue?.toString(), apply_scope: coupon?.applyScope,
      };
    });
  }

  async useCoupon(id: bigint) {
    return this.prisma.userCoupon.update({ where: { id }, data: { status: 'used', usedAt: new Date() } });
  }

  private format(c: any) {
    return {
      id: c.id.toString(), name: c.name, type: c.type, discount_value: c.discountValue.toString(),
      apply_scope: c.applyScope, apply_target_id: c.applyTargetId?.toString(),
      stock: c.stock, per_user_limit: c.perUserLimit,
      valid_type: c.validType, valid_from: c.validFrom?.toISOString(), valid_to: c.validTo?.toISOString(),
      valid_days: c.validDays, status: c.status, created_at: c.createdAt?.toISOString(),
    };
  }

  private formatUserCoupon(uc: any) {
    return {
      id: uc.id.toString(), coupon_id: uc.couponId.toString(), status: uc.status,
      valid_from: uc.validFrom?.toISOString(), valid_to: uc.validTo?.toISOString(),
      used_at: uc.usedAt?.toISOString(), received_at: uc.receivedAt?.toISOString(),
    };
  }
}
