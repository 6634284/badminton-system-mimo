import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Tag, Statistic, Table, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import http from '../../services/http';

export default function HealthPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/system/health');
        return data.data;
      } catch {
        return { status: 'error', services: {} };
      }
    },
    refetchInterval: 30000,
  });

  const { data: queues } = useQuery({
    queryKey: ['system-queues'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/system/queues');
        return data.data;
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const serviceStatus = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge status="success" text="正常" />;
      case 'degraded': return <Badge status="warning" text="降级" />;
      case 'down': return <Badge status="error" text="不可用" />;
      default: return <Badge status="default" text={status} />;
    }
  };

  return (
    <div>
      <h2>系统监控</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="系统状态"
              value={health?.status === 'healthy' ? '正常' : health?.status === 'degraded' ? '降级' : '异常'}
              valueStyle={{ color: health?.status === 'healthy' ? '#52c41a' : '#ff4d4f' }}
              prefix={health?.status === 'healthy' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="运行时间" value={health?.uptime || '-'} suffix="秒" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Node版本" value={health?.node_version || '-'} />
          </Card>
        </Col>
      </Row>

      <Card title="服务状态" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          {Object.entries(health?.services || {}).map(([name, status]: [string, any]) => (
            <Col xs={12} sm={8} md={6} key={name}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 8 }}>{name}</div>
                  {serviceStatus(status.status)}
                  {status.latency && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{status.latency}ms</div>}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="任务队列" style={{ marginTop: 16 }}>
        <Table
          dataSource={queues || []}
          rowKey="name"
          loading={isLoading}
          pagination={false}
          size="small"
          columns={[
            { title: '队列名', dataIndex: 'name', key: 'name' },
            { title: '等待中', dataIndex: 'waiting', key: 'waiting', render: (v: number) => <Tag>{v}</Tag> },
            { title: '活跃', dataIndex: 'active', key: 'active', render: (v: number) => <Tag color="blue">{v}</Tag> },
            { title: '已完成', dataIndex: 'completed', key: 'completed', render: (v: number) => <Tag color="green">{v}</Tag> },
            { title: '失败', dataIndex: 'failed', key: 'failed', render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Tag>0</Tag> },
            { title: '延迟', dataIndex: 'delayed', key: 'delayed', render: (v: number) => <Tag>{v}</Tag> },
          ]}
        />
      </Card>
    </div>
  );
}
