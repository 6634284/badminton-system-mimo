import { useState } from 'react';
import { Table, Tag, Button, Modal, InputNumber, Form, Input, message, Space, Popconfirm } from 'antd';
import { useRefundList, useCreateRefund } from '../../hooks/useRefunds';
import http from '../../services/http';
import { useQueryClient } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  processing: 'cyan',
  success: 'green',
  failed: 'red',
  rejected: 'red',
};

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已批准',
  processing: '处理中',
  success: '成功',
  failed: '失败',
  rejected: '已拒绝',
};

export default function RefundPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useRefundList({ page, pageSize: 20 });
  const createMut = useCreateRefund();

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createMut.mutateAsync(values);
      message.success('退款申请已提交');
      setCreateOpen(false);
      form.resetFields();
    } catch {
      // validation error
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await http.post(`/refunds/${id}/approve`);
      message.success('已批准');
      qc.invalidateQueries({ queryKey: ['refunds'] });
    } catch {
      message.error('操作失败');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await http.post(`/refunds/${id}/reject`);
      message.success('已拒绝');
      qc.invalidateQueries({ queryKey: ['refunds'] });
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '退款单号', dataIndex: 'refund_no', key: 'refund_no' },
    { title: '业务类型', dataIndex: 'biz_type', key: 'biz_type' },
    { title: '业务单号', dataIndex: 'biz_order_no', key: 'biz_order_no' },
    {
      title: '退款金额',
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      render: (v: string) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    { title: '退款原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '退款时间', dataIndex: 'refunded_at', key: 'refunded_at', render: (v: string) => v?.slice(0, 19)?.replace('T', ' ') || '-' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 19)?.replace('T', ' ') },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => r.status === 'pending' && (
        <Space>
          <Popconfirm title="确认批准退款？" onConfirm={() => handleApprove(r.id)}>
            <Button size="small" type="primary">批准</Button>
          </Popconfirm>
          <Popconfirm title="确认拒绝退款？" onConfirm={() => handleReject(r.id)}>
            <Button size="small" danger>拒绝</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>退款管理</h3>
        <Button type="primary" onClick={() => setCreateOpen(true)}>发起退款</Button>
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

      <Modal title="发起退款" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="paymentId" label="支付单ID" rules={[{ required: true }]}>
            <Input placeholder="输入支付订单ID" />
          </Form.Item>
          <Form.Item name="refundAmount" label="退款金额" rules={[{ required: true }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="reason" label="退款原因">
            <Input.TextArea rows={3} placeholder="请输入退款原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
