import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedisService } from '@app/infra/redis';
import { RequirePermissions } from '@app/shared/auth';

const DEFAULT_SETTINGS = [
  { key: 'cancel.free_hours', value: '24', description: '免费取消时间(小时)', category: 'cancel' },
  { key: 'cancel.penalty_percent', value: '50', description: '取消扣款比例(%)', category: 'cancel' },
  { key: 'payment.wallet_enabled', value: 'true', description: '启用钱包支付', category: 'payment' },
  { key: 'payment.wechat_enabled', value: 'true', description: '启用微信支付', category: 'payment' },
  { key: 'registration.max_per_user', value: '5', description: '每人最大报名数', category: 'registration' },
  { key: 'registration.grab_window_minutes', value: '30', description: '抢位窗口期(分钟)', category: 'registration' },
  { key: 'notification.sms_enabled', value: 'true', description: '启用短信通知', category: 'notification' },
  { key: 'notification.wechat_enabled', value: 'true', description: '启用微信通知', category: 'notification' },
];

@ApiTags('系统设置')
@ApiBearerAuth()
@Controller('/settings')
export class SettingsAdminController {
  constructor(private readonly redis: RedisService) {}

  @Get()
  @RequirePermissions('setting:list')
  @ApiOperation({ summary: '获取系统设置' })
  async list() {
    const stored = await this.redis.get('system:settings');
    const overrides = stored ? JSON.parse(stored) : {};

    return DEFAULT_SETTINGS.map((s) => ({
      ...s,
      value: overrides[s.key] ?? s.value,
    }));
  }

  @Patch(':key')
  @RequirePermissions('setting:update')
  @ApiOperation({ summary: '更新设置' })
  async update(@Param('key') key: string, @Body('value') value: string) {
    const stored = await this.redis.get('system:settings');
    const overrides = stored ? JSON.parse(stored) : {};
    overrides[key] = value;
    await this.redis.set('system:settings', JSON.stringify(overrides));
    return { success: true };
  }

  @Get('wechat-pay')
  @RequirePermissions('setting:list')
  @ApiOperation({ summary: '获取微信支付配置' })
  async getWechatPay() {
    const stored = await this.redis.get('system:wechat-pay');
    return stored ? JSON.parse(stored) : {};
  }

  @Post('wechat-pay')
  @RequirePermissions('setting:update')
  @ApiOperation({ summary: '保存微信支付配置' })
  async saveWechatPay(@Body() config: any) {
    await this.redis.set('system:wechat-pay', JSON.stringify(config));
    return { success: true };
  }

  @Post('wechat-pay/test')
  @RequirePermissions('setting:update')
  @ApiOperation({ summary: '测试微信支付连接' })
  async testWechatPay() {
    const stored = await this.redis.get('system:wechat-pay');
    if (!stored) throw new Error('请先配置微信支付');
    const config = JSON.parse(stored);
    if (!config.mch_id || !config.api_v3_key) throw new Error('配置不完整');
    return { success: true, message: '配置格式验证通过' };
  }
}
