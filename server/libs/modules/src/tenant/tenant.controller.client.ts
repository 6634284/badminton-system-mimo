import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantContextService } from './tenant-context.service';
import { Ctx } from '@app/shared/context';
import { RequestContext } from '@app/shared/context';

@ApiTags('场馆')
@ApiBearerAuth()
@Controller('/tenants')
export class TenantClientController {
  constructor(private readonly tenantContextService: TenantContextService) {}

  @Get()
  @ApiOperation({ summary: '我的场馆列表' })
  async getMyTenants(@Ctx() ctx: RequestContext) {
    return this.tenantContextService.getUserTenants(ctx.userId);
  }
}
