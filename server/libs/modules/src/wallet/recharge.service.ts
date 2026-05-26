import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { WalletService } from './wallet.service';
import { CreateRechargePackageDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class RechargeService {
  private readonly logger = new Logger(RechargeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async getPackages(tenantId: bigint) {
    const packages = await this.prisma.rechargePackage.findMany({
      where: { tenantId, status: 'active' },
      orderBy: { sort: 'asc' },
    });

    return packages.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      charge_amount: p.chargeAmount.toString(),
      gift_amount: p.giftAmount.toString(),
      sort: p.sort,
    }));
  }

  async createPackage(tenantId: bigint, dto: CreateRechargePackageDto) {
    const pkg = await this.prisma.rechargePackage.create({
      data: {
        tenantId,
        name: dto.name,
        chargeAmount: dto.chargeAmount,
        giftAmount: dto.giftAmount || 0,
        sort: dto.sort || 0,
        status: 'active',
      },
    });

    return {
      id: pkg.id.toString(),
      name: pkg.name,
      charge_amount: pkg.chargeAmount.toString(),
      gift_amount: pkg.giftAmount.toString(),
    };
  }

  async createOrder(tenantId: bigint, userId: bigint, packageId?: bigint, customAmount?: number) {
    let chargeAmount: number;
    let giftAmount = 0;

    if (packageId) {
      const pkg = await this.prisma.rechargePackage.findUnique({ where: { id: packageId } });
      if (!pkg || pkg.tenantId !== tenantId) {
        throw new NotFoundException('充值套餐不存在');
      }
      chargeAmount = Number(pkg.chargeAmount);
      giftAmount = Number(pkg.giftAmount);
    } else if (customAmount) {
      if (customAmount < 1 || customAmount > 10000) {
        throw new BadRequestException('充值金额范围: 1-10000');
      }
      chargeAmount = customAmount;
    } else {
      throw new BadRequestException('请选择充值套餐或输入金额');
    }

    const rechargeNo = `RC${Date.now()}${randomBytes(4).toString('hex')}`;

    const order = await this.prisma.rechargeOrder.create({
      data: {
        tenantId,
        userId,
        rechargeNo,
        packageId,
        chargeAmount,
        giftAmount,
        payStatus: 'created',
      },
    });

    return {
      id: order.id.toString(),
      recharge_no: order.rechargeNo,
      charge_amount: order.chargeAmount.toString(),
      gift_amount: order.giftAmount.toString(),
      pay_status: order.payStatus,
    };
  }

  async handlePaymentSuccess(rechargeNo: string, outTradeNo: string) {
    const order = await this.prisma.rechargeOrder.findUnique({
      where: { rechargeNo },
    });

    if (!order) throw new NotFoundException('充值订单不存在');
    if (order.payStatus === 'paid') return; // Idempotent

    await this.prisma.rechargeOrder.update({
      where: { id: order.id },
      data: { payStatus: 'paid', paidAt: new Date(), outTradeNo },
    });

    // Credit wallet
    const totalAmount = Number(order.chargeAmount) + Number(order.giftAmount);

    if (Number(order.chargeAmount) > 0) {
      await this.walletService.credit(
        order.tenantId,
        order.userId,
        Number(order.chargeAmount),
        'cash',
        'recharge',
        'recharge_order',
        order.id,
        `充值入账 ${order.rechargeNo}`,
      );
    }

    if (Number(order.giftAmount) > 0) {
      await this.walletService.credit(
        order.tenantId,
        order.userId,
        Number(order.giftAmount),
        'gift',
        'recharge_gift',
        'recharge_order',
        order.id,
        `充值赠送 ${order.rechargeNo}`,
      );
    }

    this.logger.log(`Recharge order ${rechargeNo} paid, credited ${totalAmount}`);
  }

  async getOrders(tenantId: bigint, userId: bigint, page = 1, pageSize = 20) {
    const [orders, total] = await Promise.all([
      this.prisma.rechargeOrder.findMany({
        where: { tenantId, userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rechargeOrder.count({ where: { tenantId, userId } }),
    ]);

    return {
      list: orders.map((o) => ({
        id: o.id.toString(),
        recharge_no: o.rechargeNo,
        charge_amount: o.chargeAmount.toString(),
        gift_amount: o.giftAmount.toString(),
        pay_status: o.payStatus,
        paid_at: o.paidAt?.toISOString(),
        created_at: o.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }
}
