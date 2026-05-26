import { useState } from 'react';
import { Table, Button, Tag, Space, Input, Select, Modal, Form, InputNumber, DatePicker, message } from 'antd';
import { PlusOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import { useActivityList, useCreateActivity, usePublishActivity, useCancelActivity } from '../../hooks';
import { useNavigate } from 'react-router-dom';

const statusMap: Record<string, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  published: { color: 'blue', text: '已发布' },
  registering: { color: 'green', text: '报名中' },
  full: { color: 'orange', text: '已满' },
  ongoing: { color: 'cyan', text: '进行中' },
  finished: { color: 'gray', text: '已结束' },
  canceled: { color: 'red', text: '已取消' },
};

export default function ActivityListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<any>({ page: 1, pageSize: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useActivityList(query);
  const createMut = useCreateActivity();
  const publishMut = usePublishActivity();
  const cancelMut = useCancelActivity();

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '日期', dataIndex: 'play_date', key: 'play_date', render: (v: string) => v?.split('T')[0] },
    { title: '容量', dataIndex: 'capacity', key: 'capacity', render: (_: any, r: any) => `${r.join_count}/${r.capacity}` },
    { title: '价格', dataIndex: 'price', key: 'price', render: (v: string) => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const info = statusMap[s] || { color: 'default', text: s };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/activities/${record.id}`)}>详情</Button>
          {record.status === 'draft' && (
            <Button size="small" type="primary" icon={<SendOutlined />}
              onClick={() => publishMut.mutate(record.id)}>发布</Button>
          )}
          {!['finished', 'canceled', 'settled'].includes(record.status) && (
            <Button size="small" danger icon={<StopOutlined />}
              onClick={() => cancelMut.mutate(record.id)}>取消</Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = async (values: any) => {
    await createMut.mutateAsync({
      ...values,
      playDate: values.playDate.format('YYYY-MM-DD'),
      startAt: values.startAt.toISOString(),
      endAt: values.endAt.toISOString(),
    });
    message.success('活动创建成功');
    setCreateOpen(false);
    form.resetFields();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input.Search placeholder="搜索活动" onSearch={(v) => setQuery({ ...query, keyword: v })} />
          <Select placeholder="状态" allowClear style={{ width: 120 }}
            onChange={(v) => setQuery({ ...query, status: v })}>
            {Object.entries(statusMap).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.text}</Select.Option>
            ))}
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          创建活动
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data?.list || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.total,
          onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
        }}
      />

      <Modal title="创建活动" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()} confirmLoading={createMut.isPending}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="open_session">开放场</Select.Option>
              <Select.Option value="private_court">包场</Select.Option>
              <Select.Option value="coach_lesson">教练课</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="venueId" label="场馆ID" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="playDate" label="活动日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="startAt" label="开始时间" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endAt" label="结束时间" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="capacity" label="容量" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="memberPrice" label="会员价">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
