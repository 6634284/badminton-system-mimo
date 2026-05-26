import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tournamentApi } from '../../services/api/tournaments';

const statusColors: Record<string, string> = { draft: 'default', published: 'blue', ongoing: 'green', finished: 'purple', canceled: 'red' };
const statusLabels: Record<string, string> = { draft: '草稿', published: '已发布', ongoing: '进行中', finished: '已结束', canceled: '已取消' };

export default function TournamentListPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tournaments', page],
    queryFn: async () => { const { data } = await tournamentApi.list({ page, pageSize: 20 }); return data.data; },
  });

  const createMut = useMutation({
    mutationFn: (values: any) => tournamentApi.create(values),
    onSuccess: () => { message.success('创建成功'); qc.invalidateQueries({ queryKey: ['tournaments'] }); setAddOpen(false); form.resetFields(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tournamentApi.updateStatus(id, status),
    onSuccess: () => { message.success('操作成功'); qc.invalidateQueries({ queryKey: ['tournaments'] }); },
  });

  const bracketMut = useMutation({
    mutationFn: (id: string) => tournamentApi.generateBracket(id),
    onSuccess: () => { message.success('对阵表已生成'); qc.invalidateQueries({ queryKey: ['tournaments'] }); },
  });

  const columns = [
    { title: '赛事名称', dataIndex: 'title', key: 'title' },
    { title: '赛制', dataIndex: 'format_type', key: 'format_type', render: (v: string) => ({ knockout: '淘汰赛', round_robin: '循环赛', manual: '手动' }[v] || v) },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'draft' && <Button size="small" type="primary" onClick={() => statusMut.mutate({ id: r.id, status: 'published' })}>发布</Button>}
          {r.status === 'published' && <Button size="small" onClick={() => bracketMut.mutate(r.id)}>生成对阵</Button>}
          {r.status === 'ongoing' && <Button size="small" onClick={() => statusMut.mutate({ id: r.id, status: 'finished' })}>结束</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>赛事管理</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>创建赛事</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data?.list || []} loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage }} />
      <Modal title="创建赛事" open={addOpen} onOk={() => form.validateFields().then((v) => createMut.mutateAsync(v))} onCancel={() => setAddOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="赛事名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="formatType" label="赛制" rules={[{ required: true }]}>
            <Select options={[{ value: 'knockout', label: '淘汰赛' }, { value: 'round_robin', label: '循环赛' }, { value: 'manual', label: '手动' }]} />
          </Form.Item>
          <Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="endDate" label="结束日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
