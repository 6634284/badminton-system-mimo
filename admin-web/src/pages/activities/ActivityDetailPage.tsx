import { useParams } from 'react-router-dom';
import { Descriptions, Tag, Table, Tabs, Spin, Card, Row, Col, Statistic } from 'antd';
import { useActivity, useActivityRegistrations } from '../../hooks';

const statusMap: Record<string, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  published: { color: 'blue', text: '已发布' },
  registering: { color: 'green', text: '报名中' },
  full: { color: 'orange', text: '已满' },
  ongoing: { color: 'cyan', text: '进行中' },
  finished: { color: 'gray', text: '已结束' },
  canceled: { color: 'red', text: '已取消' },
};

const regStatusMap: Record<string, { color: string; text: string }> = {
  paying: { color: 'processing', text: '待支付' },
  confirmed: { color: 'success', text: '已确认' },
  canceled: { color: 'default', text: '已取消' },
  refunded: { color: 'warning', text: '已退款' },
};

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: activity, isLoading } = useActivity(id!);
  const { data: regs } = useActivityRegistrations(id!);

  if (isLoading) return <Spin size="large" />;
  if (!activity) return <div>活动不存在</div>;

  const info = statusMap[activity.status] || { color: 'default', text: activity.status };

  const regColumns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '会员ID', dataIndex: 'member_id', key: 'member_id' },
    { title: '名额', dataIndex: 'total_slots', key: 'total_slots' },
    { title: '支付金额', dataIndex: 'pay_amount', key: 'pay_amount', render: (v: string) => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const r = regStatusMap[s] || { color: 'default', text: s };
        return <Tag color={r.color}>{r.text}</Tag>;
      },
    },
    { title: '报名时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="容量" value={`${activity.join_count}/${activity.capacity}`} /></Card></Col>
        <Col span={6}><Card><Statistic title="价格" value={activity.price} prefix="¥" /></Card></Col>
        <Col span={6}><Card><Statistic title="状态" valueRender={() => <Tag color={info.color}>{info.text}</Tag>} /></Card></Col>
        <Col span={6}><Card><Statistic title="报名人数" value={activity.join_count} /></Card></Col>
      </Row>

      <Tabs items={[
        {
          key: 'info',
          label: '基本信息',
          children: (
            <Descriptions column={2} bordered>
              <Descriptions.Item label="标题">{activity.title}</Descriptions.Item>
              <Descriptions.Item label="类型">{activity.type}</Descriptions.Item>
              <Descriptions.Item label="活动日期">{activity.play_date}</Descriptions.Item>
              <Descriptions.Item label="时间">{activity.start_at} ~ {activity.end_at}</Descriptions.Item>
              <Descriptions.Item label="会员价">{activity.member_price ? `¥${activity.member_price}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{activity.created_at}</Descriptions.Item>
            </Descriptions>
          ),
        },
        {
          key: 'registrations',
          label: `报名列表 (${regs?.total || 0})`,
          children: (
            <Table
              columns={regColumns}
              dataSource={regs?.list || []}
              rowKey="id"
              pagination={false}
            />
          ),
        },
      ]} />
    </div>
  );
}
