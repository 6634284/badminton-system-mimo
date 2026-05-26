import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';

@ApiTags('会员')
@ApiBearerAuth()
@Controller('/members')
export class MemberClientController {
  constructor(private readonly memberService: MemberService) {}

  @Get('me')
  @ApiOperation({ summary: '我的会员信息' })
  async getMyMember(@Ctx() ctx: RequestContext) {
    return this.memberService.findByUser(ctx.tenantId, ctx.userId);
  }

  @Get('me/cards')
  @ApiOperation({ summary: '我的会员卡' })
  async getMyCards(@Ctx() ctx: RequestContext) {
    const member = await this.memberService.findByUser(ctx.tenantId, ctx.userId);
    return this.memberService.getMemberCards(ctx.tenantId, BigInt(member.id));
  }
}
