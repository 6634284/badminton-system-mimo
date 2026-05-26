import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponApi } from '../../services/api/coupons';

const typeLabels: Record<string, string> = { discount: '折扣券', cash: '现金券', condition: '满减券' };

export default function CouponListPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', page],
    queryFn: async () => { const { data } = await couponApi.list({ page, pageSize: 20 }); return data.data; },
  });

  const createMut = useMutation({
    mutationFn: (values: any) => couponApi.create(values),
    onSuccess: () => { message.success('创建成功'); qc.invalidateQueries({ queryKey: ['coupons'] }); setAddOpen(false); form.resetFields(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => couponApi.updateStatus(id, status),
    onSuccess: () => { message.success('操作成功'); qc.invalidateQueries({ queryKey: ['coupons'] }); },
  });

  const columns = [
    { title: '优惠券名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => typeLabels[v] || v },
    { title: '面值/折扣', dataIndex: 'discount_value', key: 'discount_value', render: (v: string, r: any) => r.type === 'discount' ? `${v}折` : `¥${v}` },
    { title: '适用范围', dataIndex: 'apply_scope', key: 'apply_scope', render: (v: string) => ({ all: '全部', activity: '活动', mall: '商城', category: '分类' }[v] || v) },
    { title: '库存', dataIndex: 'stock', key: 'stock' },
    { title: '每人限领', dataIndex: 'per_user_limit', key: 'per_user_limit' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? '启用' : '停用'}</Tag> },
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
        <h3 style={{ margin: 0 }}>优惠券管理</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>创建优惠券</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data?.list || []} loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage }} />
      <Modal title="创建优惠券" open={addOpen} onOk={() => form.validateFields().then((v) => createMut.mutateAsync(v))} onCancel={() => setAddOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="优惠券名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'discount', label: '折扣券' }, { value: 'cash', label: '现金券' }, { value: 'condition', label: '满减券' }]} />
          </Form.Item>
          <Form.Item name="discountValue" label="面值/折扣" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="applyScope" label="适用范围" rules={[{ required: true }]}>
            <Select options={[{ value: 'all', label: '全部' }, { value: 'activity', label: '活动' }, { value: 'mall', label: '商城' }]} />
          </Form.Item>
          <Form.Item name="stock" label="库存" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="perUserLimit" label="每人限领"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="validType" label="有效期类型">
            <Select options={[{ value: 1, label: '固定日期' }, { value: 2, label: '领取后N天' }]} />
          </Form.Item>
          <Form.Item name="validDays" label="有效天数"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
