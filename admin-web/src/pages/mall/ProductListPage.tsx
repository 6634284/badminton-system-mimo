import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mallApi } from '../../services/api/mall';

const statusColors: Record<string, string> = { draft: 'default', on_sale: 'green', off_sale: 'red' };
const statusLabels: Record<string, string> = { draft: '草稿', on_sale: '上架', off_sale: '下架' };

export default function ProductListPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page],
    queryFn: async () => { const { data } = await mallApi.listProducts({ page, pageSize: 20 }); return data.data; },
  });

  const createMut = useMutation({
    mutationFn: (values: any) => mallApi.createProduct(values),
    onSuccess: () => { message.success('创建成功'); qc.invalidateQueries({ queryKey: ['products'] }); setAddOpen(false); form.resetFields(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => mallApi.updateProductStatus(id, status),
    onSuccess: () => { message.success('操作成功'); qc.invalidateQueries({ queryKey: ['products'] }); },
  });

  const columns = [
    { title: '商品名称', dataIndex: 'title', key: 'title' },
    { title: '发货方式', dataIndex: 'delivery_type', key: 'delivery_type', render: (v: string) => ({ virtual: '虚拟', self_pickup: '自提', express: '快递' }[v] || v) },
    { title: '排序', dataIndex: 'sort', key: 'sort' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'draft' && <Button size="small" type="primary" onClick={() => statusMut.mutate({ id: r.id, status: 'on_sale' })}>上架</Button>}
          {r.status === 'on_sale' && <Button size="small" danger onClick={() => statusMut.mutate({ id: r.id, status: 'off_sale' })}>下架</Button>}
          {r.status === 'off_sale' && <Button size="small" onClick={() => statusMut.mutate({ id: r.id, status: 'on_sale' })}>重新上架</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>商品管理</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加商品</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data?.list || []} loading={isLoading}
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage }} />
      <Modal title="添加商品" open={addOpen} onOk={() => form.validateFields().then((v) => createMut.mutateAsync(v))} onCancel={() => setAddOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="商品名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="categoryId" label="分类ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="deliveryType" label="发货方式" rules={[{ required: true }]}>
            <Select options={[{ value: 'virtual', label: '虚拟' }, { value: 'self_pickup', label: '自提' }, { value: 'express', label: '快递' }]} />
          </Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
