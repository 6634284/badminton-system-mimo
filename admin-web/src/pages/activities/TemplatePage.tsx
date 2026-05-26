import { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Popconfirm, DatePicker } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import http from '../../services/http';

export default function TemplatePage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['activity-templates'],
    queryFn: async () => { const { data } = await http.get('/activity-templates'); return data.data; },
  });

  const createMut = useMutation({
    mutationFn: (body: any) => http.post('/activity-templates', body),
    onSuccess: () => { message.success('模板已创建'); qc.invalidateQueries({ queryKey: ['activity-templates'] }); setCreateOpen(false); form.resetFields(); },
    onError: () => message.error('创建失败'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => http.delete(`/activity-templates/${id}`),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['activity-templates'] }); },
  });

  const batchMut = useMutation({
    mutationFn: (body: any) => http.post('/activity-templates/batch-publish', body),
    onSuccess: (res) => { message.success(`批量发布成功: ${res.data?.data?.count || 0} 个活动`); setBatchOpen(false); },
    onError: () => message.error('批量发布失败'),
  });

  const columns = [
    { title: '模板名称', dataIndex: 'name', key: 'name' },
    { title: '活动类型', dataIndex: 'activity_type', key: 'activity_type' },
    { title: '价格', dataIndex: 'price', key: 'price', render: (v: string) => `¥${v}` },
    { title: '人数上限', dataIndex: 'max_participants', key: 'max_participants' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" type="primary" onClick={() => { setSelectedTemplate(r); setBatchOpen(true); }}>批量发布</Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>活动模板管理</h2>
        <Button type="primary" onClick={() => setCreateOpen(true)}>新建模板</Button>
      </div>

      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" pagination={false} />

      <Modal title="新建模板" open={createOpen} onOk={() => form.submit()} onCancel={() => setCreateOpen(false)} width={600}>
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="如：周三羽毛球" />
          </Form.Item>
          <Form.Item name="activity_type" label="活动类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'open_session', label: '开放场' }, { value: 'training', label: '训练' }, { value: 'match', label: '比赛' }]} />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="max_participants" label="人数上限" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="批量发布活动" open={batchOpen} onOk={() => batchForm.submit()} onCancel={() => setBatchOpen(false)}>
        <Form form={batchForm} layout="vertical" onFinish={(v) => batchMut.mutate({ templateId: selectedTemplate?.id, ...v })}>
          <Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="结束日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="weekdays" label="星期">
            <Select mode="multiple" options={[
              { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
              { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 0, label: '周日' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
