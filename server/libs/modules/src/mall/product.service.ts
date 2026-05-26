import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, dto: any) {
    return this.prisma.product.create({ data: { tenantId, ...dto } });
  }

  async findAll(tenantId: bigint, page = 1, pageSize = 20, status?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { sort: 'asc' } }),
      this.prisma.product.count({ where }),
    ]);
    return { list: items.map((p) => this.format(p)), total, page, pageSize };
  }

  async findOne(tenantId: bigint, id: bigint) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('商品不存在');
    const skus = await this.prisma.productSku.findMany({ where: { productId: id, deletedAt: null } });
    return { ...this.format(product), skus: skus.map((s) => ({ id: s.id.toString(), sku_code: s.skuCode, spec: s.spec, price: s.price.toString(), stock: s.stock })) };
  }

  async update(id: bigint, dto: any) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async updateStatus(id: bigint, status: string) {
    return this.prisma.product.update({ where: { id }, data: { status } });
  }

  private format(p: any) {
    return {
      id: p.id.toString(), tenant_id: p.tenantId.toString(), category_id: p.categoryId.toString(),
      title: p.title, cover_url: p.coverUrl, detail_html: p.detailHtml, delivery_type: p.deliveryType,
      status: p.status, sort: p.sort, created_at: p.createdAt?.toISOString(),
    };
  }
}
