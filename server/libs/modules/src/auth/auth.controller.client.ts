import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@app/shared/auth';
import { AuthService } from './auth.service';
import { WxLoginDto, SmsLoginDto, RefreshTokenDto, TokenResponseDto, LoginResponseDto } from './dto';

@ApiTags('认证')
@Controller('auth')
export class AuthClientController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wx-login')
  @ApiOperation({ summary: '微信小程序登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto.code);
  }

  @Public()
  @Post('sms-login')
  @ApiOperation({ summary: '短信验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  async smsLogin(@Body() dto: SmsLoginDto) {
    return this.authService.smsLogin(dto.phone, dto.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新令牌' })
  @ApiResponse({ status: 200, description: '刷新成功', type: TokenResponseDto })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出登录' })
  @ApiResponse({ status: 200, description: '退出成功' })
  async logout(@Body('access_token') accessToken: string) {
    await this.authService.logout(accessToken);
    return { success: true };
  }
}
