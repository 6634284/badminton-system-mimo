import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, theme } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  WalletOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  ShopOutlined,
  TrophyOutlined,
  SolutionOutlined,
  TagOutlined,
  BellOutlined,
  FileTextOutlined,
  SafetyOutlined,
  CloudOutlined,
  ExportOutlined,
  ScheduleOutlined,
  HeartOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/auth';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { type: 'divider' as const },
  { type: 'group' as const, label: '业务管理' },
  { key: '/activities', icon: <CalendarOutlined />, label: '活动管理' },
  { key: '/templates', icon: <ScheduleOutlined />, label: '活动模板' },
  { key: '/members', icon: <TeamOutlined />, label: '会员管理' },
  { key: '/venues', icon: <EnvironmentOutlined />, label: '球馆管理' },
  { key: '/bookings', icon: <HeartOutlined />, label: '场地预约' },
  { key: '/wallets', icon: <WalletOutlined />, label: '钱包管理' },
  { key: '/refunds', icon: <CreditCardOutlined />, label: '退款管理' },
  { type: 'divider' as const },
  { type: 'group' as const, label: '扩展功能' },
  { key: '/mall/products', icon: <ShopOutlined />, label: '商城管理' },
  { key: '/tournaments', icon: <TrophyOutlined />, label: '赛事管理' },
  { key: '/coaches', icon: <SolutionOutlined />, label: '教练管理' },
  { key: '/coupons', icon: <TagOutlined />, label: '优惠券管理' },
  { type: 'divider' as const },
  { type: 'group' as const, label: '运营工具' },
  { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  { key: '/exports', icon: <ExportOutlined />, label: '数据导出' },
  { type: 'divider' as const },
  { type: 'group' as const, label: '系统管理' },
  { key: '/staff', icon: <UserOutlined />, label: '人员管理' },
  { key: '/tenants', icon: <FileTextOutlined />, label: '租户管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  { key: '/wechat-pay', icon: <CloudOutlined />, label: '微信支付' },
  { key: '/notification-templates', icon: <BellOutlined />, label: '通知模板' },
  { key: '/health', icon: <SafetyOutlined />, label: '系统监控' },
];

export default function BasicLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const userMenuItems = [
    { key: 'profile', label: '个人信息' },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={200}>
        <div style={{ height: 32, margin: 16, textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? '羽' : '羽毛球俱乐部'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.nickname || '管理员'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
