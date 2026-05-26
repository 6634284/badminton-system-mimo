import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { randomBytes } from 'crypto';

@Injectable()
export class MallOrderService {
  private readonly logger = new Logger(MallOrderService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, userId: bigint, dto: { items: { skuId: string; quantity: number }[] }) {
    if (!dto.items?.length) throw new BadRequestException('订单商品不能为空');

    const orderNo = `MO${Date.now()}${randomBytes(4).toString('hex')}`;
    let totalAmount = 0;

    const orderItemsData: any[] = [];
    for (const item of dto.items) {
      const sku = await this.prisma.productSku.findUnique({ where: { id: BigInt(item.skuId) } });
      if (!sku) throw new NotFoundException(`SKU ${item.skuId} 不存在`);
      if (sku.stock < item.quantity) throw new BadRequestException(`库存不足`);

      const product = await this.prisma.product.findUnique({ where: { id: sku.productId } });
      const unitPrice = Number(sku.price);
      totalAmount += unitPrice * item.quantity;
      orderItemsData.push({
        skuId: sku.id, productId: sku.productId,
        skuSnapshot: { sku_code: sku.skuCode, spec: sku.spec, price: sku.price.toString(), product_title: product?.title },
        quantity: item.quantity, unitPrice: sku.price,
      });
    }

    const order = await this.prisma.mallOrder.create({
      data: {
        tenantId, userId, orderNo, totalAmount, payableAmount: totalAmount,
        status: 'pending_pay',
      },
    });

    // Create items separately
    await this.prisma.mallOrderItem.createMany({
      data: orderItemsData.map((d) => ({ ...d, orderId: order.id })),
    });

    // Deduct stock
    for (const item of dto.items) {
      await this.prisma.productSku.update({
        where: { id: BigInt(item.skuId) },
        data: { stock: { decrement: item.quantity } },
      });
    }

    this.logger.log(`Mall order created: ${orderNo}`);
    const items = await this.prisma.mallOrderItem.findMany({ where: { orderId: order.id } });
    return this.format(order, items);
  }

  async list(tenantId: bigint, userId: bigint, page = 1, pageSize = 20) {
    const where: any = { tenantId, deletedAt: null };
    if (userId) where.userId = userId;
    const [orders, total] = await Promise.all([
      this.prisma.mallOrder.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.mallOrder.count({ where }),
    ]);
    const orderIds = orders.map((o) => o.id);
    const allItems = await this.prisma.mallOrderItem.findMany({ where: { orderId: { in: orderIds } } });
    const itemsMap = new Map<string, any[]>();
    for (const item of allItems) {
      const key = item.orderId.toString();
      if (!itemsMap.has(key)) itemsMap.set(key, []);
      itemsMap.get(key)!.push(item);
    }
    return { list: orders.map((o) => this.format(o, itemsMap.get(o.id.toString()) || [])), total, page, pageSize };
  }

  async findOne(tenantId: bigint, id: bigint) {
    const order = await this.prisma.mallOrder.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!order) throw new NotFoundException('订单不存在');
    const items = await this.prisma.mallOrderItem.findMany({ where: { orderId: id } });
    return this.format(order, items);
  }

  async updateStatus(id: bigint, status: string) {
    const data: any = { status };
    if (status === 'paid') data.paidAt = new Date();
    return this.prisma.mallOrder.update({ where: { id }, data });
  }

  private format(o: any, items: any[]) {
    return {
      id: o.id.toString(), order_no: o.orderNo, total_amount: o.totalAmount.toString(),
      payable_amount: o.payableAmount.toString(), discount_amount: o.discountAmount.toString(),
      status: o.status, delivery_type: o.deliveryType,
      items: items.map((i) => ({
        id: i.id.toString(), sku_id: i.skuId.toString(), product_id: i.productId.toString(),
        sku_snapshot: i.skuSnapshot, quantity: i.quantity, unit_price: i.unitPrice.toString(),
      })),
      paid_at: o.paidAt?.toISOString(), created_at: o.createdAt?.toISOString(),
    };
  }
}
