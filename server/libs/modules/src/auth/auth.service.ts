import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import * as bcrypt from 'bcryptjs';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async wxLogin(code: string) {
    // TODO: Call WeChat code2session API to get openid/session_key
    // For now, use code as a mock openid for development
    const openId = `wx_${code}`;

    // Find or create user by oauth binding
    let binding = await this.prisma.userOauthBinding.findUnique({
      where: { provider_openId: { provider: 'wechat_mp', openId } },
    });

    let user;
    if (binding) {
      user = await this.prisma.user.findUnique({ where: { id: binding.userId } });
    }

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          nickname: `用户${openId.slice(-6)}`,
          unionId: openId,
          status: 'active',
        },
      });

      await this.prisma.userOauthBinding.create({
        data: {
          userId: user.id,
          provider: 'wechat_mp',
          openId,
          extra: {},
        },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id);
  }

  async smsLogin(phone: string, code: string) {
    // TODO: Verify SMS code from Redis
    const cachedCode = await this.redis.get(`sms:${phone}`);
    if (!cachedCode || cachedCode !== code) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // Find or create user by phone
    const phoneHash = this.hashPhone(phone);
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneHash },
          { phone },
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          phoneHash,
          nickname: `用户${phone.slice(-4)}`,
          status: 'active',
        },
      });
    }

    // Clear SMS code
    await this.redis.del(`sms:${phone}`);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id);
  }

  async adminLogin(username: string, password: string) {
    // Find user by phone or nickname as username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: username },
          { nickname: username },
        ],
        status: 'active',
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // Get staff info and roles
    const staff = await this.prisma.tenantStaff.findFirst({
      where: { userId: user.id, status: 'active', deletedAt: null },
    });

    const roles: string[] = [];
    let tenantIdForToken: bigint | undefined;

    if (staff) {
      const role = await this.prisma.role.findUnique({ where: { id: staff.roleId } });
      if (role) roles.push(role.code);
      tenantIdForToken = staff.tenantId;
    }

    // Check if platform admin
    const platformStaff = await this.prisma.tenantStaff.findFirst({
      where: {
        userId: user.id,
        tenantId: BigInt(0),
        status: 'active',
        deletedAt: null,
      },
    });
    if (platformStaff) {
      const role = await this.prisma.role.findUnique({ where: { id: platformStaff.roleId } });
      if (role && !roles.includes(role.code)) roles.push(role.code);
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, tenantIdForToken, roles);

    return {
      ...tokens,
      user: {
        id: user.id.toString(),
        nickname: user.nickname || '',
        avatar_url: user.avatarUrl || '',
        roles,
      },
      tenant_id: tenantIdForToken?.toString(),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // Check if token is blacklisted
      const blacklisted = await this.redis.get(`blacklist:${refreshToken}`);
      if (blacklisted) {
        throw new UnauthorizedException('令牌已失效');
      }

      return this.generateTokens(
        BigInt(payload.sub),
        payload.tenantId ? BigInt(payload.tenantId) : undefined,
        payload.roles,
      );
    } catch {
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  async logout(accessToken: string) {
    try {
      const payload = this.jwtService.decode(accessToken);
      if (payload?.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(`blacklist:${accessToken}`, '1', ttl);
        }
      }
    } catch {
      // Ignore decode errors
    }
  }

  private async generateTokens(userId: bigint, tenantId?: bigint, roles?: string[]) {
    const payload = {
      sub: userId.toString(),
      tenantId: tenantId?.toString(),
      roles: roles || [],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        { expiresIn: ACCESS_TOKEN_EXPIRES },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        { expiresIn: REFRESH_TOKEN_EXPIRES },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_TTL_SECONDS,
    };
  }

  private hashPhone(phone: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(phone).digest('hex');
  }
}
