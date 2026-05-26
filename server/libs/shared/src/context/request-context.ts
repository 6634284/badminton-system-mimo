export interface RequestContext {
  tenantId: bigint;
  userId: bigint;
  traceId: string;
  locale: string;
  now: Date;
  ip: string;
  userAgent: string;
}
