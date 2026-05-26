import { useState } from 'react';
import { Table, Button, Tag, Space, Input, Modal, Form, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useVenueList, useCreateVenue, useGenerateSchedules } from '../../hooks';

export default function VenueListPage() {
  const [query, setQuery] = useState<any>({ page: 1, pageSize: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useVenueList(query);
  const createMut = useCreateVenue();
  const genSchedulesMut = useGenerateSchedules();

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '城市', dataIndex: 'city', key: 'city' },
    { title: '区域', dataIndex: 'district', key: 'district' },
    { title: '地址', dataIndex: 'address', key: 'address' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => handleGenSchedules(record.id)}>生成排期</Button>
        </Space>
      ),
    },
  ];

  const handleCreate = async (values: any) => {
    await createMut.mutateAsync(values);
    message.success('场馆创建成功');
    setCreateOpen(false);
    form.resetFields();
  };

  const handleGenSchedules = async (venueId: string) => {
    await genSchedulesMut.mutateAsync({ venueId: parseInt(venueId), days: 14 });
    message.success('排期生成成功');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="搜索场馆" onSearch={(v) => setQuery({ ...query, keyword: v })} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          创建场馆
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

      <Modal title="创建场馆" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()} confirmLoading={createMut.isPending}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input />
          </Form.Item>
          <Form.Item name="district" label="区域">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
