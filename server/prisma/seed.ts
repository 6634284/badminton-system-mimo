import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

function phoneHash(phone: string): string {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Default permissions
  const permissions = [
    // Platform
    { code: 'platform:tenant:list', name: '查看租户列表', module: 'platform' },
    { code: 'platform:tenant:create', name: '创建租户', module: 'platform' },
    { code: 'platform:tenant:update', name: '更新租户', module: 'platform' },
    { code: 'platform:tenant:approve', name: '审批租户', module: 'platform' },
    { code: 'platform:config:manage', name: '管理平台配置', module: 'platform' },
    { code: 'platform:finance:view', name: '查看平台财务', module: 'platform' },
    { code: 'platform:finance:settle', name: '结算管理', module: 'platform' },
    { code: 'platform:audit:view', name: '查看审计日志', module: 'platform' },

    // Club
    { code: 'club:profile:manage', name: '管理俱乐部信息', module: 'club' },
    { code: 'club:staff:manage', name: '管理人员', module: 'club' },
    { code: 'club:role:manage', name: '管理角色', module: 'club' },

    // Venue
    { code: 'venue:list', name: '查看球馆', module: 'venue' },
    { code: 'venue:create', name: '创建球馆', module: 'venue' },
    { code: 'venue:update', name: '更新球馆', module: 'venue' },
    { code: 'venue:court:manage', name: '管理场地', module: 'venue' },
    { code: 'venue:schedule:manage', name: '管理排期', module: 'venue' },

    // Activity
    { code: 'activity:list', name: '查看活动', module: 'activity' },
    { code: 'activity:create', name: '创建活动', module: 'activity' },
    { code: 'activity:update', name: '更新活动', module: 'activity' },
    { code: 'activity:publish', name: '发布活动', module: 'activity' },
    { code: 'activity:cancel', name: '取消活动', module: 'activity' },
    { code: 'activity:registration:view', name: '查看报名', module: 'activity' },
    { code: 'activity:checkin', name: '签到管理', module: 'activity' },

    // Member
    { code: 'member:list', name: '查看会员', module: 'member' },
    { code: 'member:create', name: '创建会员', module: 'member' },
    { code: 'member:update', name: '更新会员', module: 'member' },
    { code: 'member:import', name: '导入会员', module: 'member' },
    { code: 'member:blacklist', name: '黑名单管理', module: 'member' },
    { code: 'member:card:manage', name: '管理会员卡', module: 'member' },

    // Wallet
    { code: 'wallet:view', name: '查看钱包', module: 'wallet' },
    { code: 'wallet:adjust', name: '调整余额', module: 'wallet' },
    { code: 'wallet:recharge:manage', name: '管理充值套餐', module: 'wallet' },
    { code: 'wallet:refund:manage', name: '退款管理', module: 'wallet' },

    // Mall
    { code: 'mall:product:manage', name: '管理商品', module: 'mall' },
    { code: 'mall:order:manage', name: '管理订单', module: 'mall' },
    { code: 'mall:category:manage', name: '管理分类', module: 'mall' },

    // Coach
    { code: 'coach:manage', name: '管理教练', module: 'coach' },
    { code: 'coach:lesson:manage', name: '管理课程', module: 'coach' },

    // Tournament
    { code: 'tournament:manage', name: '管理赛事', module: 'tournament' },
    { code: 'tournament:result:manage', name: '管理比赛结果', module: 'tournament' },

    // Marketing
    { code: 'marketing:coupon:manage', name: '管理优惠券', module: 'marketing' },
    { code: 'marketing:banner:manage', name: '管理Banner', module: 'marketing' },

    // Report
    { code: 'report:sales:view', name: '查看销售报表', module: 'report' },
    { code: 'report:member:view', name: '查看会员报表', module: 'report' },
    { code: 'report:finance:view', name: '查看财务报表', module: 'report' },
    { code: 'report:export', name: '导出报表', module: 'report' },

    // System
    { code: 'system:config:manage', name: '系统配置', module: 'system' },
    { code: 'system:notification:manage', name: '通知管理', module: 'system' },
    { code: 'system:queue:view', name: '查看队列', module: 'system' },
    { code: 'system:health:view', name: '查看系统健康', module: 'system' },

    // Export
    { code: 'export:create', name: '创建导出', module: 'export' },
    { code: 'export:list', name: '查看导出', module: 'export' },

    // Notification
    { code: 'notification:list', name: '查看通知', module: 'notification' },
    { code: 'notification:send', name: '发送通知', module: 'notification' },

    // Booking
    { code: 'booking:list', name: '查看预约', module: 'booking' },
    { code: 'booking:manage', name: '管理预约', module: 'booking' },

    // Setting
    { code: 'setting:list', name: '查看设置', module: 'setting' },
    { code: 'setting:update', name: '更新设置', module: 'setting' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`Created ${permissions.length} permissions`);

  // 2. System roles (tenant_id=0 means system-level)
  const systemRoles = [
    { code: 'platform_admin', name: '平台管理员', isSystem: true },
    { code: 'platform_ops', name: '平台运营', isSystem: true },
    { code: 'tenant_owner', name: '俱乐部管理员', isSystem: true },
    { code: 'staff_front', name: '前台', isSystem: true },
    { code: 'staff_finance', name: '财务', isSystem: true },
    { code: 'staff_coach', name: '教练', isSystem: true },
  ];

  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { tenantId_code: { tenantId: BigInt(0), code: role.code } },
      update: {},
      create: { ...role, tenantId: BigInt(0) },
    });
  }
  console.log(`Created ${systemRoles.length} system roles`);

  // 3. Assign permissions to platform_admin role (all permissions)
  const platformAdminRole = await prisma.role.findUnique({
    where: { tenantId_code: { tenantId: BigInt(0), code: 'platform_admin' } },
  });

  if (platformAdminRole) {
    const allPerms = await prisma.permission.findMany();
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: platformAdminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: platformAdminRole.id,
          permissionId: perm.id,
        },
      });
    }
    console.log(`Assigned all permissions to platform_admin`);
  }

  // 4. Assign permissions to tenant_owner role (club-related)
  const tenantOwnerRole = await prisma.role.findUnique({
    where: { tenantId_code: { tenantId: BigInt(0), code: 'tenant_owner' } },
  });

  if (tenantOwnerRole) {
    const clubPerms = await prisma.permission.findMany({
      where: {
        module: { in: ['club', 'venue', 'activity', 'member', 'wallet', 'mall', 'coach', 'tournament', 'marketing', 'report'] },
      },
    });
    for (const perm of clubPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: tenantOwnerRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: tenantOwnerRole.id,
          permissionId: perm.id,
        },
      });
    }
    console.log(`Assigned club permissions to tenant_owner`);
  }

  // 5. Test tenant
  const testTenant = await prisma.tenant.upsert({
    where: { code: 'test-club' },
    update: {},
    create: {
      code: 'test-club',
      name: '测试羽毛球馆',
      status: 'active',
      plan: 'trial',
      contactName: '测试管理员',
      contactPhone: '13800138000',
      settings: {
        allowGuest: true,
        currency: 'CNY',
      },
    },
  });
  console.log(`Created test tenant: ${testTenant.name}`);

  // 6. Test users
  const testUser = await prisma.user.upsert({
    where: { unionId: 'test-union-001' },
    update: {},
    create: {
      nickname: '测试用户',
      phone: '13800138001',
      phoneHash: phoneHash('13800138001'),
      unionId: 'test-union-001',
      avatarUrl: '',
      status: 'active',
    },
  });

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { unionId: 'test-union-admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      nickname: '平台管理员',
      phone: '13800138000',
      phoneHash: phoneHash('13800138000'),
      unionId: 'test-union-admin',
      passwordHash: adminPasswordHash,
      avatarUrl: '',
      status: 'active',
    },
  });

  const tenantAdminHash = await bcrypt.hash('tenant123', 10);
  const tenantAdmin = await prisma.user.upsert({
    where: { unionId: 'test-union-tenant-admin' },
    update: { passwordHash: tenantAdminHash },
    create: {
      nickname: '俱乐部管理员',
      phone: '13800138002',
      phoneHash: phoneHash('13800138002'),
      unionId: 'test-union-tenant-admin',
      passwordHash: tenantAdminHash,
      avatarUrl: '',
      status: 'active',
    },
  });
  console.log(`Created test users`);

  // 7. Assign staff to tenant
  await prisma.tenantStaff.upsert({
    where: { tenantId_userId: { tenantId: testTenant.id, userId: adminUser.id } },
    update: {},
    create: {
      tenantId: testTenant.id,
      userId: adminUser.id,
      roleId: platformAdminRole!.id,
      isOwner: true,
      status: 'active',
    },
  });

  await prisma.tenantStaff.upsert({
    where: { tenantId_userId: { tenantId: testTenant.id, userId: tenantAdmin.id } },
    update: {},
    create: {
      tenantId: testTenant.id,
      userId: tenantAdmin.id,
      roleId: tenantOwnerRole!.id,
      isOwner: true,
      status: 'active',
    },
  });

  await prisma.tenantStaff.upsert({
    where: { tenantId_userId: { tenantId: testTenant.id, userId: testUser.id } },
    update: {},
    create: {
      tenantId: testTenant.id,
      userId: testUser.id,
      roleId: (await prisma.role.findUnique({ where: { tenantId_code: { tenantId: BigInt(0), code: 'staff_front' } } }))!.id,
      isOwner: false,
      status: 'active',
    },
  });
  console.log(`Assigned staff to test tenant`);

  // 8. Create member for test user
  await prisma.member.upsert({
    where: { tenantId_userId: { tenantId: testTenant.id, userId: testUser.id } },
    update: {},
    create: {
      tenantId: testTenant.id,
      userId: testUser.id,
      memberNo: 'M00001',
      level: 1,
      points: 0,
      totalSpentAmount: 0,
      source: 'direct',
    },
  });

  // 9. Create wallet for test user
  await prisma.wallet.upsert({
    where: { tenantId_userId: { tenantId: testTenant.id, userId: testUser.id } },
    update: {},
    create: {
      tenantId: testTenant.id,
      userId: testUser.id,
      cashBalance: 0,
      giftBalance: 0,
      frozenBalance: 0,
      version: 0,
    },
  });
  console.log(`Created member and wallet for test user`);

  // 10. Test venue and court
  const testVenue = await prisma.venue.create({
    data: {
      tenantId: testTenant.id,
      name: '测试球馆A',
      city: '北京',
      district: '朝阳区',
      address: '测试路123号',
      latitude: 39.9042,
      longitude: 116.4074,
      status: 'active',
    },
  });

  await prisma.court.createMany({
    data: [
      { tenantId: testTenant.id, venueId: testVenue.id, code: 'A1', type: 'standard', basePrice: 60, status: 'active' },
      { tenantId: testTenant.id, venueId: testVenue.id, code: 'A2', type: 'standard', basePrice: 60, status: 'active' },
      { tenantId: testTenant.id, venueId: testVenue.id, code: 'A3', type: 'standard', basePrice: 60, status: 'active' },
      { tenantId: testTenant.id, venueId: testVenue.id, code: 'B1', type: 'training', basePrice: 80, status: 'active' },
    ],
  });
  console.log(`Created test venue with 4 courts`);

  // 11. Default recharge packages
  await prisma.rechargePackage.createMany({
    data: [
      { tenantId: testTenant.id, name: '充100送10', chargeAmount: 100, giftAmount: 10, sort: 1, status: 'active' },
      { tenantId: testTenant.id, name: '充200送30', chargeAmount: 200, giftAmount: 30, sort: 2, status: 'active' },
      { tenantId: testTenant.id, name: '充500送100', chargeAmount: 500, giftAmount: 100, sort: 3, status: 'active' },
    ],
  });
  console.log(`Created recharge packages`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
