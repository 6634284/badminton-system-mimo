import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from './request-context';

export const Ctx = createParamDecorator(
  (data: keyof RequestContext | undefined, ctx: ExecutionContext): RequestContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const context: RequestContext = {
      tenantId: request.tenantId || BigInt(0),
      userId: request.user?.userId || request.userId || BigInt(0),
      traceId: request.traceId || '',
      locale: request.headers['accept-language'] || 'zh-CN',
      now: new Date(),
      ip: request.ip || request.headers['x-forwarded-for'] || '',
      userAgent: request.headers['user-agent'] || '',
    };

    return data ? context[data] : context;
  },
);
