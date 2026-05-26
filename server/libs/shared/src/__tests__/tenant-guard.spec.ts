import { ExecutionContext } from '@nestjs/common';
import { TenantGuard } from '../auth/tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let mockPrisma: any;
  let mockReflector: any;

  beforeEach(() => {
    mockPrisma = {
      tenantStaff: {
        findFirst: jest.fn(),
      },
    };
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    guard = new TenantGuard(mockPrisma, mockReflector);
  });

  function createContext(user: any, headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          headers: {
            'x-tenant-id': headers['x-tenant-id'] || '1',
            ...headers,
          },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as any;
  }

  it('should allow access when user belongs to tenant', async () => {
    mockPrisma.tenantStaff.findFirst.mockResolvedValue({ id: 1, status: 'active' });
    const ctx = createContext(
      { userId: BigInt(1), roles: ['staff'] },
      { 'x-tenant-id': '1' },
    );
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should block cross-tenant access', async () => {
    mockPrisma.tenantStaff.findFirst.mockResolvedValue(null);
    const ctx = createContext(
      { userId: BigInt(1), roles: ['staff'] },
      { 'x-tenant-id': '2' },
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow('无权访问该租户');
  });

  it('should allow platform admin to access any tenant', async () => {
    const ctx = createContext(
      { userId: BigInt(1), roles: ['platform_admin'] },
      { 'x-tenant-id': '2' },
    );
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should block access when no user in request', async () => {
    const ctx = createContext(null);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('should block access when no tenant header for regular user', async () => {
    const ctx = createContext({ userId: BigInt(1), roles: ['staff'] }, {});
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
