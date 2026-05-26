import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { ActivityService } from './activity.service';

export interface ActivityTemplate {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  venue_id: string;
  title_pattern: string;
  capacity: number;
  price: number;
  member_price?: number;
  cancel_policy: any;
  court_ids: string[];
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  register_open_minutes: number;
  created_at: string;
}

@Injectable()
export class ActivityTemplateService {
  private readonly logger = new Logger(ActivityTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly activityService: ActivityService,
  ) {}

  async create(tenantId: bigint, userId: bigint, dto: Omit<ActivityTemplate, 'id' | 'tenant_id' | 'created_at'>) {
    const id = `tpl:${tenantId}:${Date.now()}`;
    const template: ActivityTemplate = {
      ...dto,
      id,
      tenant_id: tenantId.toString(),
      created_at: new Date().toISOString(),
    };

    await this.redis.set(`activity:template:${id}`, JSON.stringify(template), 86400 * 365);
    await this.addToIndex(tenantId, id);

    this.logger.log(`Activity template created: ${id}`);
    return template;
  }

  async list(tenantId: bigint) {
    const ids = await this.getTemplateIds(tenantId);
    const templates: ActivityTemplate[] = [];

    for (const id of ids) {
      const data = await this.redis.get(`activity:template:${id}`);
      if (data) templates.push(JSON.parse(data));
    }

    return templates.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async findOne(tenantId: bigint, templateId: string) {
    const data = await this.redis.get(`activity:template:${templateId}`);
    if (!data) throw new NotFoundException('模板不存在');

    const template = JSON.parse(data) as ActivityTemplate;
    if (template.tenant_id !== tenantId.toString()) throw new NotFoundException('模板不存在');

    return template;
  }

  async delete(tenantId: bigint, templateId: string) {
    await this.findOne(tenantId, templateId);
    await this.redis.del(`activity:template:${templateId}`);
    await this.removeFromIndex(tenantId, templateId);
    return { success: true };
  }

  /**
   * Batch publish activities from template for a date range
   */
  async batchPublish(tenantId: bigint, userId: bigint, dto: {
    templateId: string;
    dates: string[];
  }) {
    const template = await this.findOne(tenantId, dto.templateId);
    const results: any[] = [];

    for (const dateStr of dto.dates) {
      try {
        const date = new Date(dateStr);
        const startAt = new Date(date);
        startAt.setHours(template.start_hour, template.start_minute, 0, 0);
        const endAt = new Date(date);
        endAt.setHours(template.end_hour, template.end_minute, 0, 0);

        const title = template.title_pattern
          .replace('{date}', dateStr)
          .replace('{weekday}', ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]);

        const activity = await this.activityService.create(tenantId, userId, {
          venueId: Number(template.venue_id),
          type: template.type,
          title,
          playDate: dateStr,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          capacity: template.capacity,
          price: template.price,
          memberPrice: template.member_price,
          cancelPolicy: template.cancel_policy,
        });

        results.push({ date: dateStr, status: 'ok', activity_id: activity?.id });
      } catch (err: any) {
        results.push({ date: dateStr, status: 'error', error: err.message });
      }
    }

    return {
      template_id: template.id,
      total: dto.dates.length,
      success: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  private async addToIndex(tenantId: bigint, id: string) {
    const key = `activity:template:index:${tenantId}`;
    const existing = await this.redis.get(key);
    const ids = existing ? JSON.parse(existing) : [];
    ids.push(id);
    await this.redis.set(key, JSON.stringify(ids), 86400 * 365);
  }

  private async removeFromIndex(tenantId: bigint, id: string) {
    const key = `activity:template:index:${tenantId}`;
    const existing = await this.redis.get(key);
    if (!existing) return;
    const ids = JSON.parse(existing).filter((i: string) => i !== id);
    await this.redis.set(key, JSON.stringify(ids), 86400 * 365);
  }

  private async getTemplateIds(tenantId: bigint): Promise<string[]> {
    const key = `activity:template:index:${tenantId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : [];
  }
}
