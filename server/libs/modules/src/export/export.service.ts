import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';

export interface ExportRequest {
  type: string;
  format?: string;
  filters?: Record<string, any>;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create export job. Returns job ID for polling.
   */
  async createExport(tenantId: bigint, userId: bigint, dto: ExportRequest) {
    const jobId = `export:${tenantId}:${Date.now()}`;

    await this.redis.set(`export:status:${jobId}`, JSON.stringify({
      status: 'pending',
      type: dto.type,
      format: dto.format || 'csv',
      created_at: new Date().toISOString(),
      progress: 0,
    }), 3600);

    this.processExport(jobId, tenantId, dto).catch((err) => {
      this.logger.error(`Export failed: ${jobId}`, err);
      this.redis.set(`export:status:${jobId}`, JSON.stringify({
        status: 'failed',
        error: err.message,
      }), 3600);
    });

    return { job_id: jobId, status: 'pending' };
  }

  async getStatus(jobId: string) {
    const data = await this.redis.get(`export:status:${jobId}`);
    if (!data) return { status: 'not_found' };
    return JSON.parse(data);
  }

  async getResult(jobId: string): Promise<string | null> {
    return this.redis.get(`export:result:${jobId}`);
  }

  private async processExport(jobId: string, tenantId: bigint, dto: ExportRequest) {
    await this.redis.set(`export:status:${jobId}`, JSON.stringify({
      status: 'processing',
      type: dto.type,
      progress: 10,
    }), 3600);

    let data: any[] = [];
    let headers: string[] = [];

    switch (dto.type) {
      case 'members':
        ({ data, headers } = await this.exportMembers(tenantId, dto.filters));
        break;
      case 'registrations':
        ({ data, headers } = await this.exportRegistrations(tenantId, dto.filters));
        break;
      case 'wallet_transactions':
        ({ data, headers } = await this.exportWalletTransactions(tenantId, dto.filters));
        break;
      case 'settlements':
        ({ data, headers } = await this.exportSettlements(tenantId, dto.filters));
        break;
      default:
        throw new Error(`Unsupported export type: ${dto.type}`);
    }

    const csv = this.toCSV(headers, data);

    await this.redis.set(`export:result:${jobId}`, csv, 3600);
    await this.redis.set(`export:status:${jobId}`, JSON.stringify({
      status: 'completed',
      type: dto.type,
      progress: 100,
      record_count: data.length,
      download_url: `/api/admin/v1/exports/${encodeURIComponent(jobId)}/download`,
    }), 3600);

    this.logger.log(`Export completed: ${jobId}, ${data.length} records`);
  }

  private async exportMembers(tenantId: bigint, filters?: Record<string, any>) {
    const where: any = { tenantId, deletedAt: null };
    if (filters?.blacklisted !== undefined) where.blacklisted = filters.blacklisted;

    const members = await this.prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Get user info for each member
    const userIds = members.map((m) => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, phone: true, gender: true },
    });
    const userMap = new Map(users.map((u) => [u.id.toString(), u]));

    const headers = ['会员编号', '姓名', '手机号', '性别', '等级', '积分', '入会时间'];
    const data = members.map((m) => {
      const user = userMap.get(m.userId.toString());
      return [
        m.memberNo,
        user?.nickname || '-',
        user?.phone || '-',
        user?.gender || '-',
        m.level,
        m.points,
        m.joinedAt.toISOString().slice(0, 10),
      ];
    });

    return { data, headers };
  }

  private async exportRegistrations(tenantId: bigint, filters?: Record<string, any>) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const registrations = await this.prisma.activityRegistration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', '活动ID', '用户ID', '状态', '报名时间'];
    const data = registrations.map((r) => [
      r.id.toString(),
      r.activityId.toString(),
      r.userId.toString(),
      r.status,
      r.createdAt.toISOString().slice(0, 19).replace('T', ' '),
    ]);

    return { data, headers };
  }

  private async exportWalletTransactions(tenantId: bigint, filters?: Record<string, any>) {
    const where: any = { tenantId };
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', '用户ID', '类型', '方向', '金额', '备注', '时间'];
    const data = transactions.map((t) => [
      t.id.toString(),
      t.userId.toString(),
      t.bizType,
      t.direction,
      t.amount.toString(),
      t.remark || '-',
      t.createdAt.toISOString().slice(0, 19).replace('T', ' '),
    ]);

    return { data, headers };
  }

  private async exportSettlements(tenantId: bigint, filters?: Record<string, any>) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;

    const settlements = await this.prisma.settlementOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['结算单号', '周期开始', '周期结束', '总额', '退款', '佣金', '应付', '状态'];
    const data = settlements.map((s) => [
      s.settlementNo,
      s.periodStart.toISOString().slice(0, 10),
      s.periodEnd.toISOString().slice(0, 10),
      s.grossAmount.toString(),
      s.refundAmount.toString(),
      s.commissionAmount.toString(),
      s.payableAmount.toString(),
      s.status,
    ]);

    return { data, headers };
  }

  private toCSV(headers: string[], rows: any[][]): string {
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    return lines.join('\n');
  }
}
