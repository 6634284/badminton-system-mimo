import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { CreatePaymentDto, PaymentQueryDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(tenantId: bigint, userId: bigint, dto: CreatePaymentDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('支付金额必须大于0');
    }

    const outTradeNo = `PAY${Date.now()}${randomBytes(4).toString('hex')}`;

    // Check for existing payment for this biz order
    const existing = await this.prisma.paymentOrder.findFirst({
      where: {
        bizType: dto.bizType,
        bizOrderNo: dto.bizOrderNo,
        status: { in: ['created', 'paying', 'paid'] },
      },
    });

    if (existing) {
      if (existing.status === 'paid') {
        throw new BadRequestException('该订单已支付');
      }
      return this.formatPayment(existing);
    }

    const payment = await this.prisma.paymentOrder.create({
      data: {
        tenantId,
        userId,
        outTradeNo,
        bizType: dto.bizType,
        bizOrderNo: dto.bizOrderNo,
        attemptNo: 1,
        payChannel: dto.payChannel || 'wechat_jsapi',
        amount: dto.amount,
        status: 'created',
      },
    });

    this.logger.log(`Payment order created: ${outTradeNo} for ${dto.bizType}:${dto.bizOrderNo}`);
    return this.formatPayment(payment);
  }

  async handleWechatCallback(outTradeNo: string, transactionId: string, payload: any) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { outTradeNo },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for outTradeNo: ${outTradeNo}`);
      return false;
    }

    if (payment.status === 'paid') {
      return true; // Idempotent
    }

    await this.prisma.paymentOrder.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        notifyPayload: payload,
      },
    });

    // Trigger downstream effects based on bizType
    await this.onPaymentSuccess(payment);

    this.logger.log(`Payment ${outTradeNo} confirmed via callback, txnId=${transactionId}`);
    return true;
  }

  private async onPaymentSuccess(payment: any) {
    try {
      if (payment.bizType === 'activity') {
        // Confirm the registration
        const regId = BigInt(payment.bizOrderNo);
        await this.prisma.activityRegistration.update({
          where: { id: regId },
          data: { status: 'confirmed', payOrderNo: payment.outTradeNo },
        });
        this.logger.log(`Registration ${regId} confirmed after payment ${payment.outTradeNo}`);
      } else if (payment.bizType === 'recharge') {
        // Credit wallet
        const orderId = BigInt(payment.bizOrderNo);
        const order = await this.prisma.rechargeOrder.findUnique({
          where: { id: orderId },
        });
        if (order) {
          // Find user's wallet and credit it
          const wallet = await this.prisma.wallet.findFirst({
            where: { userId: payment.userId, tenantId: payment.tenantId },
          });
          if (wallet) {
            const amount = Number(order.chargeAmount);
            const giftAmount = Number(order.giftAmount || 0);
            // Credit cash
            await this.prisma.$executeRaw`
              UPDATE wallets SET cash_balance = cash_balance + ${amount}, version = version + 1
              WHERE id = ${wallet.id} AND version = ${wallet.version}
            `;
            // Credit gift if any
            if (giftAmount > 0) {
              await this.prisma.$executeRaw`
                UPDATE wallets SET gift_balance = gift_balance + ${giftAmount}, version = version + 1
                WHERE id = ${wallet.id}
              `;
            }
            // Write transaction log
            await this.prisma.walletTransaction.create({
              data: {
                tenantId: payment.tenantId,
                userId: payment.userId,
                walletId: wallet.id,
                subAccount: 'cash',
                direction: 'C',
                amount,
                bizType: 'recharge',
                sourceType: 'recharge_order',
                sourceId: orderId,
                remark: `充值入账 ¥${amount}`,
              },
            });
            if (giftAmount > 0) {
              await this.prisma.walletTransaction.create({
                data: {
                  tenantId: payment.tenantId,
                  userId: payment.userId,
                  walletId: wallet.id,
                  subAccount: 'gift',
                  direction: 'C',
                  amount: giftAmount,
                  bizType: 'recharge_gift',
                  sourceType: 'recharge_order',
                  sourceId: orderId,
                  remark: `赠送入账 ¥${giftAmount}`,
                },
              });
            }
            // Update order status
            await this.prisma.rechargeOrder.update({
              where: { id: orderId },
              data: { payStatus: 'paid', paidAt: new Date() },
            });
            this.logger.log(`Recharge order ${orderId} processed, credited ¥${amount} + ¥${giftAmount} gift`);
          }
        }
      }
    } catch (e) {
      this.logger.error(`Failed to process downstream for payment ${payment.outTradeNo}: ${e}`);
    }
  }

  async handleRefundCallback(refundNo: string, payload: any) {
    const refund = await this.prisma.refundOrder.findUnique({
      where: { refundNo },
    });

    if (!refund) {
      this.logger.warn(`Refund not found: ${refundNo}`);
      return false;
    }

    if (refund.status === 'success') {
      return true; // Idempotent
    }

    await this.prisma.refundOrder.update({
      where: { id: refund.id },
      data: {
        status: 'success',
        refundedAt: new Date(),
      },
    });

    this.logger.log(`Refund ${refundNo} confirmed via callback`);
    return true;
  }

  async findOne(tenantId: bigint, paymentId: bigint) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('支付订单不存在');
    }

    return this.formatPayment(payment);
  }

  async findByBizOrder(tenantId: bigint, bizType: string, bizOrderNo: string) {
    const payment = await this.prisma.paymentOrder.findFirst({
      where: { tenantId, bizType, bizOrderNo },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) throw new NotFoundException('支付订单不存在');
    return this.formatPayment(payment);
  }

  async findAll(tenantId: bigint, query: PaymentQueryDto) {
    const where: any = { tenantId };
    if (query.bizType) where.bizType = query.bizType;
    if (query.status) where.status = query.status;

    const [payments, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return {
      list: payments.map((p) => this.formatPayment(p)),
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  private formatPayment(p: any) {
    return {
      id: p.id.toString(),
      tenant_id: p.tenantId.toString(),
      user_id: p.userId.toString(),
      out_trade_no: p.outTradeNo,
      biz_type: p.bizType,
      biz_order_no: p.bizOrderNo,
      pay_channel: p.payChannel,
      amount: p.amount.toString(),
      status: p.status,
      paid_at: p.paidAt?.toISOString(),
      created_at: p.createdAt.toISOString(),
    };
  }
}
