import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  constructor(private readonly prisma: PrismaService) {}

  async add(tenantId: bigint, userId: bigint, dto: { skuId: string; quantity: number }) {
    const existing = await this.prisma.cart.findUnique({
      where: { tenantId_userId_skuId: { tenantId, userId, skuId: BigInt(dto.skuId) } },
    });
    if (existing) {
      return this.prisma.cart.update({ where: { id: existing.id }, data: { quantity: existing.quantity + dto.quantity } });
    }
    return this.prisma.cart.create({ data: { tenantId, userId, skuId: BigInt(dto.skuId), quantity: dto.quantity } });
  }

  async list(tenantId: bigint, userId: bigint) {
    const items = await this.prisma.cart.findMany({ where: { tenantId, userId }, orderBy: { createdAt: 'desc' } });
    const skuIds = items.map((c) => c.skuId);
    const skus = await this.prisma.productSku.findMany({ where: { id: { in: skuIds } } });
    const products = await this.prisma.product.findMany({ where: { id: { in: skus.map((s) => s.productId) } } });
    const skuMap = new Map(skus.map((s) => [s.id.toString(), s]));
    const prodMap = new Map(products.map((p) => [p.id.toString(), p]));

    return items.map((c) => {
      const sku = skuMap.get(c.skuId.toString());
      const prod = sku ? prodMap.get(sku.productId.toString()) : null;
      return {
        id: c.id.toString(), sku_id: c.skuId.toString(), quantity: c.quantity, selected: c.selected,
        product_title: prod?.title, sku_code: sku?.skuCode, spec: sku?.spec,
        sku_price: sku?.price?.toString(), cover_url: prod?.coverUrl,
      };
    });
  }

  async updateQuantity(id: bigint, quantity: number) {
    return this.prisma.cart.update({ where: { id }, data: { quantity } });
  }

  async remove(id: bigint) {
    return this.prisma.cart.delete({ where: { id } });
  }

  async clear(tenantId: bigint, userId: bigint) {
    return this.prisma.cart.deleteMany({ where: { tenantId, userId } });
  }
}
