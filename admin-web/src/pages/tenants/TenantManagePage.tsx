import { useState } from 'react';
import { Table, Tag, Space, Button, Modal, Input, message } from 'antd';
import { useTenantList, useApproveTenant, useRejectTenant, useSuspendTenant } from '../../hooks/useTenants';

const statusColors: Record<string, string> = {
  pending: 'orange',
  active: 'green',
  rejected: 'red',
  suspended: 'default',
};

const statusLabels: Record<string, string> = {
  pending: '待审核',
  active: '正常',
  rejected: '已拒绝',
  suspended: '已暂停',
};

export default function TenantManagePage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useTenantList({ page, pageSize: 20, keyword });
  const approveMut = useApproveTenant();
  const rejectMut = useRejectTenant();
  const suspendMut = useSuspendTenant();

  const handleApprove = (id: string) => {
    Modal.confirm({
      title: '确认审批通过？',
      onOk: async () => {
        await approveMut.mutateAsync(id);
        message.success('审批通过');
      },
    });
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await rejectMut.mutateAsync({ id: rejectId, reason: rejectReason });
    message.success('已拒绝');
    setRejectId(null);
    setRejectReason('');
  };

  const handleSuspend = (id: string) => {
    Modal.confirm({
      title: '确认暂停该场馆？',
      onOk: async () => {
        await suspendMut.mutateAsync(id);
        message.success('已暂停');
      },
    });
  };

  const columns = [
    { title: '场馆名称', dataIndex: 'name', key: 'name' },
    { title: '编码', dataIndex: 'code', key: 'code' },
    { title: '联系人', dataIndex: 'contact_name', key: 'contact_name' },
    { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone' },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button size="small" type="primary" onClick={() => handleApprove(record.id)}>
                通过
              </Button>
              <Button size="small" danger onClick={() => setRejectId(record.id)}>
                拒绝
              </Button>
            </>
          )}
          {record.status === 'active' && (
            <Button size="small" danger onClick={() => handleSuspend(record.id)}>
              暂停
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索场馆名称"
          style={{ width: 300 }}
          onSearch={(v) => { setKeyword(v); setPage(1); }}
          allowClear
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.list || []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total || 0,
          onChange: setPage,
        }}
      />

      <Modal
        title="拒绝原因"
        open={!!rejectId}
        onOk={handleReject}
        onCancel={() => { setRejectId(null); setRejectReason(''); }}
      >
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请输入拒绝原因"
        />
      </Modal>
    </div>
  );
}
