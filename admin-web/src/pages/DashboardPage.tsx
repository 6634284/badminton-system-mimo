import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarOutlined,
  TeamOutlined,
  WalletOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import http from '../services/http';

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/dashboard/stats');
        return data.data;
      } catch {
        return null;
      }
    },
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/activities', { params: { pageSize: 5 } });
        return data.data?.list || [];
      } catch {
        return [];
      }
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/wallet/recharge-orders', { params: { pageSize: 5 } });
        return data.data?.list || [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div>
      <h2>工作台</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日活动" value={stats?.today_activities || 0} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="活跃会员" value={stats?.active_members || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日收入" value={stats?.today_revenue || 0} precision={2} prefix={<WalletOutlined />} suffix="元" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="本月订单" value={stats?.month_orders || 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="赛事数" value={stats?.tournaments || 0} prefix={<TrophyOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="商城订单" value={stats?.mall_orders || 0} prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="近期活动" size="small">
            <Table dataSource={recentActivities} rowKey="id" size="small" pagination={false}
              columns={[
                { title: '活动', dataIndex: 'title', key: 'title' },
                { title: '日期', dataIndex: 'play_date', key: 'play_date', width: 120 },
                { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: string) => (
                  <Tag color={s === 'published' ? 'green' : s === 'ongoing' ? 'blue' : 'default'}>{s}</Tag>
                )},
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近充值订单" size="small">
            <Table dataSource={recentOrders} rowKey="id" size="small" pagination={false}
              columns={[
                { title: '订单号', dataIndex: 'order_no', key: 'order_no', ellipsis: true },
                { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, render: (v: string) => `¥${v}` },
                { title: '状态', dataIndex: 'pay_status', key: 'pay_status', width: 80, render: (s: string) => (
                  <Tag color={s === 'paid' ? 'green' : s === 'pending' ? 'orange' : 'red'}>{s === 'paid' ? '已付' : s === 'pending' ? '待付' : s}</Tag>
                )},
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
