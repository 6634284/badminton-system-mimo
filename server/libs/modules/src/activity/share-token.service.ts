import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { randomBytes } from 'crypto';

@Injectable()
export class ShareTokenService {
  private readonly logger = new Logger(ShareTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: bigint, activityId: bigint, userId?: bigint, channel?: string) {
    const token = randomBytes(32).toString('hex');

    const shareToken = await this.prisma.activityShareToken.create({
      data: {
        tenantId,
        activityId,
        token,
        sharerUserId: userId,
        channel,
        registerCount: 0,
      },
    });

    return {
      id: shareToken.id.toString(),
      token: shareToken.token,
      activity_id: shareToken.activityId.toString(),
    };
  }

  async validate(token: string) {
    const shareToken = await this.prisma.activityShareToken.findUnique({
      where: { token },
    });

    if (!shareToken) return null;

    // Increment register count
    await this.prisma.activityShareToken.update({
      where: { id: shareToken.id },
      data: { registerCount: { increment: 1 } },
    });

    return {
      activity_id: shareToken.activityId.toString(),
      sharer_user_id: shareToken.sharerUserId?.toString(),
      channel: shareToken.channel,
    };
  }
}
