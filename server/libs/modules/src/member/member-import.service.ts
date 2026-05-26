import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { EncryptionService } from '@app/shared/crypto/encryption.service';

export interface ImportRow {
  name: string;
  phone: string;
  gender?: string;
  id_card?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

@Injectable()
export class MemberImportService {
  private readonly logger = new Logger(MemberImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Get Excel template headers
   */
  getTemplateHeaders(): string[] {
    return ['姓名', '手机号', '性别', '身份证号', '紧急联系人', '紧急联系电话'];
  }

  /**
   * Get template sample data
   */
  getTemplateSample(): ImportRow[] {
    return [
      { name: '张三', phone: '13800138001', gender: '男', id_card: '110101199001011234', emergency_contact: '李四', emergency_phone: '13800138002' },
      { name: '王五', phone: '13800138003', gender: '女' },
    ];
  }

  /**
   * Parse Excel rows to ImportRow[]
   */
  parseRows(rows: any[][]): ImportRow[] {
    return rows.slice(1).map((row) => ({
      name: String(row[0] || '').trim(),
      phone: String(row[1] || '').trim(),
      gender: String(row[2] || '').trim(),
      id_card: String(row[3] || '').trim(),
      emergency_contact: String(row[4] || '').trim(),
      emergency_phone: String(row[5] || '').trim(),
    })).filter((r) => r.name && r.phone);
  }

  /**
   * Validate import rows
   */
  validateRows(rows: ImportRow[]): { valid: ImportRow[]; errors: { row: number; message: string }[] } {
    const valid: ImportRow[] = [];
    const errors: { row: number; message: string }[] = [];
    const phoneRegex = /^1[3-9]\d{9}$/;

    rows.forEach((row, index) => {
      const rowNum = index + 2; // Excel row (1-indexed, skip header)

      if (!row.name) {
        errors.push({ row: rowNum, message: '姓名不能为空' });
        return;
      }
      if (!row.phone || !phoneRegex.test(row.phone)) {
        errors.push({ row: rowNum, message: '手机号格式不正确' });
        return;
      }
      if (row.id_card && !/^\d{17}[\dXx]$/.test(row.id_card)) {
        errors.push({ row: rowNum, message: '身份证号格式不正确' });
        return;
      }

      valid.push(row);
    });

    return { valid, errors };
  }

  /**
   * Async import with progress tracking
   */
  async startImport(tenantId: bigint, rows: ImportRow[], jobId: string): Promise<void> {
    await this.redis.set(`import:${jobId}:status`, 'running', 3600);
    await this.redis.set(`import:${jobId}:total`, String(rows.length), 3600);
    await this.redis.set(`import:${jobId}:progress`, '0', 3600);

    let success = 0;
    let failed = 0;
    const errorDetails: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Check if phone already exists
        const existingUser = await this.prisma.user.findFirst({
          where: { phone: row.phone, deletedAt: null },
        });

        if (existingUser) {
          // Check if already a member of this tenant
          const existingMember = await this.prisma.member.findFirst({
            where: { tenantId, userId: existingUser.id, deletedAt: null },
          });

          if (existingMember) {
            errorDetails.push(`行${i + 2}: 手机号${row.phone}已是会员`);
            failed++;
            continue;
          }

          // Add as member
          await this.prisma.member.create({
            data: {
              tenantId,
              userId: existingUser.id,
              memberNo: `M${Date.now()}${i}`,
              level: 0,
            },
          });
        } else {
          // Create user and member
          const user = await this.prisma.user.create({
            data: {
              phone: row.phone,
              nickname: row.name,
              gender: row.gender === '男' ? 1 : row.gender === '女' ? 2 : 0,
              realName: row.id_card ? Buffer.from(this.encryption.encrypt(row.name)) : null,
              idCard: row.id_card ? Buffer.from(this.encryption.encrypt(row.id_card)) : null,
            },
          });

          await this.prisma.member.create({
            data: {
              tenantId,
              userId: user.id,
              memberNo: `M${Date.now()}${i}`,
              level: 0,
            },
          });
        }

        success++;
      } catch (error) {
        errorDetails.push(`行${i + 2}: ${error.message}`);
        failed++;
      }

      await this.redis.set(`import:${jobId}:progress`, String(i + 1), 3600);
    }

    const result = { success, failed, errors: errorDetails };
    await this.redis.set(`import:${jobId}:status`, 'completed', 3600);
    await this.redis.set(`import:${jobId}:result`, JSON.stringify(result), 3600);

    this.logger.log(`Import job ${jobId} completed: ${success} success, ${failed} failed`);
  }

  /**
   * Get import job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    const status = await this.redis.get(`import:${jobId}:status`);
    if (!status) return null;

    const total = await this.redis.get(`import:${jobId}:total`);
    const progress = await this.redis.get(`import:${jobId}:progress`);
    const resultStr = await this.redis.get(`import:${jobId}:result`);

    return {
      status,
      total: Number(total || 0),
      progress: Number(progress || 0),
      result: resultStr ? JSON.parse(resultStr) : null,
    };
  }
}
