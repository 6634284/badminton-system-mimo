import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coachApi } from '../../services/api/coaches';

export default function CoachListPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['coaches', page],
    queryFn: async () => { const { data } = await coachApi.list({ page, pageSize: 20 }); return data.data; },
  });

  const createMut = useMutation({
    mutationFn: (values: any) => coachApi.create(values),
    onSuccess: () => { message.success('创建成功'); qc.invalidateQueries({ queryKey: ['coaches'] }); setAddOpen(false); form.resetFields(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => coachApi.updateStatus(id, status),
    onSuccess: () => { message.success('操作成功'); qc.invalidateQueries({ queryKey: ['coaches'] }); },
  });

  const columns = [
    { title: '教练姓名', dataIndex: 'name', key: 'name' },
    { title: '等级', dataIndex: 'level', key: 'level' },
    { title: '时薪', dataIndex: 'price_per_hour', key: 'price_per_hour', render: (v: string) => `¥${v}` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? '在职' : '停用'}</Tag> },
    { title: '简介', dataIndex: 'intro', key: 'intro', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'active' ? (
            <Button size="small" danger onClick={() => statusMut.mutate({ id: r.id, status: 'inactive' })}>停用</Button>
          ) : (
            <Button size="small" type="primary" onClick={() => statusMut.mutate({ id: r.id, status: 'active' })}>启用</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>教练管理</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加教练</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data?.list || []} loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage }} />
      <Modal title="添加教练" open={addOpen} onOk={() => form.validateFields().then((v) => createMut.mutateAsync(v))} onCancel={() => setAddOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="用户ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="教练姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="level" label="等级"><Input /></Form.Item>
          <Form.Item name="pricePerHour" label="时薪"><InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" /></Form.Item>
          <Form.Item name="intro" label="简介"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
