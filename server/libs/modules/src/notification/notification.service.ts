import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send in-app notification
   */
  async send(tenantId: bigint, userId: bigint, dto: { bizType: string; bizId?: string; title: string; content: string; channel?: string }) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        bizType: dto.bizType,
        bizId: dto.bizId,
        title: dto.title,
        content: dto.content,
        channel: dto.channel || 'in_app',
      },
    });

    this.logger.log(`Notification sent: ${dto.title} to user ${userId}`);
    return this.formatNotification(notification);
  }

  /**
   * Bulk send notification to multiple users
   */
  async bulkSend(tenantId: bigint, userIds: bigint[], dto: { bizType: string; title: string; content: string; channel?: string }) {
    const results = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        tenantId,
        userId,
        bizType: dto.bizType,
        title: dto.title,
        content: dto.content,
        channel: dto.channel || 'in_app',
      })),
    });

    this.logger.log(`Bulk notification sent: ${dto.title} to ${results.count} users`);
    return { count: results.count };
  }

  /**
   * Get user notifications
   */
  async findByUser(tenantId: bigint, userId: bigint, page = 1, pageSize = 20, unreadOnly = false) {
    const where: any = { tenantId, userId };
    if (unreadOnly) where.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { tenantId, userId, isRead: false } }),
    ]);

    return {
      list: items.map((n) => this.formatNotification(n)),
      total,
      unread_count: unreadCount,
      page,
      pageSize,
    };
  }

  /**
   * Mark notification as read
   */
  async markRead(id: bigint, userId: bigint) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllRead(tenantId: bigint, userId: bigint) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  /**
   * Get notification list for admin (all users in tenant)
   */
  async listForAdmin(tenantId: bigint, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { tenantId } }),
    ]);

    return {
      list: items.map((n) => this.formatNotification(n)),
      total,
      page,
      pageSize,
    };
  }

  private formatNotification(n: any) {
    return {
      id: n.id.toString(),
      tenant_id: n.tenantId.toString(),
      user_id: n.userId.toString(),
      biz_type: n.bizType,
      biz_id: n.bizId,
      title: n.title,
      content: n.content,
      channel: n.channel,
      is_read: n.isRead,
      read_at: n.readAt?.toISOString(),
      created_at: n.createdAt.toISOString(),
    };
  }
}
