import { useState } from 'react';
import { Table, Button, Select, message, Space, Tag, Card } from 'antd';
import { DownloadOutlined, ExportOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import http from '../../services/http';

const EXPORT_TYPES = [
  { value: 'members', label: '会员列表' },
  { value: 'registrations', label: '报名记录' },
  { value: 'wallet_transactions', label: '钱包交易' },
  { value: 'settlements', label: '结算记录' },
];

export default function ExportPage() {
  const qc = useQueryClient();
  const [exportType, setExportType] = useState('members');

  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/exports');
        return data.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
  });

  const createMut = useMutation({
    mutationFn: (type: string) => http.post('/exports', { type }),
    onSuccess: () => { message.success('导出任务已创建'); qc.invalidateQueries({ queryKey: ['exports'] }); },
    onError: () => message.error('创建失败'),
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => EXPORT_TYPES.find(t => t.value === v)?.label || v },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => (
      <Tag color={s === 'completed' ? 'green' : s === 'processing' ? 'blue' : 'orange'}>{s === 'completed' ? '已完成' : s === 'processing' ? '处理中' : '待处理'}</Tag>
    )},
    { title: '记录数', dataIndex: 'record_count', key: 'record_count' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 19) },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => r.status === 'completed' && (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => window.open(`/api/admin/v1/exports/${r.id}/download`)}>
          下载
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h2>数据导出</h2>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select value={exportType} onChange={setExportType} options={EXPORT_TYPES} style={{ width: 200 }} />
          <Button type="primary" icon={<ExportOutlined />} onClick={() => createMut.mutate(exportType)} loading={createMut.isPending}>
            创建导出任务
          </Button>
        </Space>
      </Card>

      <Table columns={columns} dataSource={exports || []} loading={isLoading} rowKey="id" pagination={false} />
    </div>
  );
}
