import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { WalletService } from '@app/modules/wallet';
import { RefundDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async createRefund(tenantId: bigint, userId: bigint, dto: RefundDto) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { id: BigInt(dto.paymentId) },
    });

    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('支付订单不存在');
    }

    if (payment.status !== 'paid') {
      throw new BadRequestException('只能退款已支付的订单');
    }

    if (dto.refundAmount > Number(payment.amount)) {
      throw new BadRequestException('退款金额不能超过支付金额');
    }

    // Check existing refunds
    const existingRefunds = await this.prisma.refundOrder.findMany({
      where: { paymentId: payment.id, status: { in: ['pending', 'success'] } },
    });

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.refundAmount), 0);
    if (totalRefunded + dto.refundAmount > Number(payment.amount)) {
      throw new BadRequestException('累计退款金额不能超过支付金额');
    }

    const refundNo = `RF${Date.now()}${randomBytes(4).toString('hex')}`;

    const refund = await this.prisma.refundOrder.create({
      data: {
        tenantId,
        userId,
        refundNo,
        paymentId: payment.id,
        bizType: payment.bizType,
        bizOrderNo: payment.bizOrderNo,
        refundAmount: dto.refundAmount,
        status: 'pending',
      },
    });

    // For wallet payments, refund directly to wallet
    if (payment.payChannel === 'wallet') {
      await this.processWalletRefund(refund.id, tenantId, userId, dto.refundAmount, refundNo);
    }

    this.logger.log(`Refund order created: ${refundNo} for payment ${payment.outTradeNo}`);
    return this.formatRefund(refund);
  }

  async processWalletRefund(refundId: bigint, tenantId: bigint, userId: bigint, amount: number, refundNo: string) {
    await this.walletService.credit(
      tenantId,
      userId,
      amount,
      'cash',
      'refund',
      'refund_order',
      refundId,
      `退款入账 ${refundNo}`,
    );

    await this.prisma.refundOrder.update({
      where: { id: refundId },
      data: { status: 'success', refundedAt: new Date() },
    });

    this.logger.log(`Wallet refund processed: ${refundNo}, amount=${amount}`);
  }

  async findAll(tenantId: bigint, page = 1, pageSize = 20) {
    const [refunds, total] = await Promise.all([
      this.prisma.refundOrder.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refundOrder.count({ where: { tenantId } }),
    ]);

    return {
      list: refunds.map((r) => this.formatRefund(r)),
      total,
      page,
      pageSize,
    };
  }

  async findByUser(tenantId: bigint, userId: bigint, page = 1, pageSize = 20) {
    const [refunds, total] = await Promise.all([
      this.prisma.refundOrder.findMany({
        where: { tenantId, userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refundOrder.count({ where: { tenantId, userId } }),
    ]);

    return {
      list: refunds.map((r) => this.formatRefund(r)),
      total,
      page,
      pageSize,
    };
  }

  private formatRefund(r: any) {
    return {
      id: r.id.toString(),
      refund_no: r.refundNo,
      payment_id: r.paymentId.toString(),
      biz_type: r.bizType,
      biz_order_no: r.bizOrderNo,
      refund_amount: r.refundAmount.toString(),
      status: r.status,
      refunded_at: r.refundedAt?.toISOString(),
      created_at: r.createdAt.toISOString(),
    };
  }
}
