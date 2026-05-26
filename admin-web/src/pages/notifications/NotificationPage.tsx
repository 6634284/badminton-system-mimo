import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Space, message, Modal, Input, Select } from 'antd';
import { notificationApi } from '../../services/api';

export default function NotificationPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [sendModal, setSendModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'system', target: 'all', target_ids: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications', page],
    queryFn: async () => { const { data } = await notificationApi.adminList({ page, pageSize: 20 }); return data.data; },
  });

  const sendMut = useMutation({
    mutationFn: (body: any) => notificationApi.adminSend(body),
    onSuccess: () => { message.success('发送成功'); qc.invalidateQueries({ queryKey: ['admin-notifications'] }); setSendModal(false); },
    onError: () => message.error('发送失败'),
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => t?.slice(0, 19) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>消息通知管理</h2>
        <Button type='primary' onClick={() => setSendModal(true)}>发送通知</Button>
      </div>
      <Table columns={columns} dataSource={data?.list || []} loading={isLoading} rowKey='id'
        pagination={{ current: page, total: data?.total, pageSize: 20, onChange: setPage }} />
      <Modal title='发送通知' open={sendModal} onOk={() => sendMut.mutate(form)} onCancel={() => setSendModal(false)} width={600}>
        <Space direction='vertical' style={{ width: '100%' }} size='middle'>
          <Input placeholder='标题' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input.TextArea placeholder='内容' value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} />
          <Select value={form.type} onChange={v => setForm({ ...form, type: v })} options={[{ value: 'system', label: '系统通知' }, { value: 'activity', label: '活动通知' }, { value: 'payment', label: '支付通知' }]} />
          <Select value={form.target} onChange={v => setForm({ ...form, target: v })} options={[{ value: 'all', label: '全部用户' }, { value: 'tenant', label: '租户用户' }, { value: 'specific', label: '指定用户' }]} />
        </Space>
      </Modal>
    </div>
  );
}
