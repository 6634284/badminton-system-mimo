import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/infra/redis';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * WeChat mini-program login: code2session
   */
  async code2session(code: string): Promise<{ openid: string; session_key: string; unionid?: string }> {
    const appId = this.config.get('WX_APP_ID');
    const appSecret = this.config.get('WX_APP_SECRET');

    if (!appId || !appSecret) {
      this.logger.warn('WeChat credentials not configured, using mock mode');
      return { openid: `mock_openid_${code}`, session_key: `mock_session_${Date.now()}` };
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        this.logger.error(`WeChat code2session error: ${data.errmsg}`);
        throw new Error(data.errmsg);
      }

      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid,
      };
    } catch (error) {
      this.logger.error(`WeChat code2session failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string> {
    const cached = await this.redis.get('wechat:access_token');
    if (cached) return cached;

    const appId = this.config.get('WX_APP_ID');
    const appSecret = this.config.get('WX_APP_SECRET');

    if (!appId || !appSecret) {
      return 'mock_access_token';
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      throw new Error(data.errmsg);
    }

    await this.redis.set('wechat:access_token', data.access_token, data.expires_in - 300);
    return data.access_token;
  }

  /**
   * Send subscribe message
   */
  async sendSubscribeMessage(openid: string, templateId: string, data: any, page?: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

    const body = {
      touser: openid,
      template_id: templateId,
      page: page || 'pages/home/index',
      data,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.errcode !== 0) {
        this.logger.error(`Subscribe message error: ${result.errmsg}`);
      }
    } catch (error) {
      this.logger.error(`Subscribe message failed: ${error.message}`);
    }
  }

  /**
   * Decrypt WeChat encrypted data
   */
  decryptData(encryptedData: string, iv: string, sessionKey: string): any {
    try {
      const crypto = require('crypto');
      const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');

      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
      let decoded = decipher.update(encryptedDataBuffer, undefined, 'utf8');
      decoded += decipher.final('utf8');

      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error(`Decrypt data failed: ${error.message}`);
      throw error;
    }
  }
}
