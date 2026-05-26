import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, message, Modal, Input } from 'antd';
import { bookingApi } from '../../services/api';

export default function BookingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', page],
    queryFn: async () => { const { data } = await bookingApi.adminList({ page, pageSize: 20 }); return data.data; },
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => bookingApi.adminCancel(id, reason),
    onSuccess: () => { message.success('已取消'); qc.invalidateQueries({ queryKey: ['admin-bookings'] }); setCancelId(null); },
    onError: () => message.error('取消失败'),
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '场地', dataIndex: 'court_name', key: 'court_name' },
    { title: '日期', dataIndex: 'booking_date', key: 'booking_date' },
    { title: '时段', key: 'time', render: (_: any, r: any) => `${r.start_time}-${r.end_time}` },
    { title: '会员', dataIndex: 'member_name', key: 'member_name' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => (
      <Tag color={s === 'confirmed' ? 'green' : s === 'cancelled' ? 'red' : 'blue'}>{s === 'confirmed' ? '已确认' : s === 'cancelled' ? '已取消' : s}</Tag>
    )},
    { title: '操作', key: 'action', render: (_: any, r: any) => r.status === 'confirmed' && (
      <Button size='small' danger onClick={() => setCancelId(r.id)}>取消</Button>
    )},
  ];

  return (
    <div>
      <h2>场地预约管理</h2>
      <Table columns={columns} dataSource={data?.list || []} loading={isLoading} rowKey='id'
        pagination={{ current: page, total: data?.total, pageSize: 20, onChange: setPage }} />
      <Modal title='取消预约' open={!!cancelId} onOk={() => cancelId && cancelMut.mutate({ id: cancelId, reason: cancelReason })} onCancel={() => setCancelId(null)}>
        <Input.TextArea placeholder='取消原因' value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} />
      </Modal>
    </div>
  );
}
