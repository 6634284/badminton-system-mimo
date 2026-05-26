import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag } from 'antd';

const DEFAULT_TEMPLATES = [
  { key: 'registration_success', name: '报名成功通知', type: 'activity', content: '您已成功报名活动「{{activity_title}}」，时间：{{play_date}} {{start_time}}-{{end_time}}' },
  { key: 'payment_success', name: '支付成功通知', type: 'payment', content: '支付成功，金额：¥{{amount}}，订单号：{{order_no}}' },
  { key: 'refund_success', name: '退款成功通知', type: 'payment', content: '退款成功，金额：¥{{amount}}，已退回钱包' },
  { key: 'activity_cancel', name: '活动取消通知', type: 'activity', content: '活动「{{activity_title}}」已取消，费用将自动退回' },
  { key: 'wallet_recharge', name: '充值成功通知', type: 'payment', content: '充值成功，金额：¥{{amount}}，当前余额：¥{{balance}}' },
];

export default function NotificationTemplatePage() {
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    { title: '模板Key', dataIndex: 'key', key: 'key', width: 200 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: '操作', key: 'action', width: 150,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => { form.setFieldsValue(r); setEditOpen(true); }}>编辑</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>通知模板管理</h2>
      </div>

      <Table columns={columns} dataSource={DEFAULT_TEMPLATES} rowKey="key" pagination={false} />

      <Modal title="编辑模板" open={editOpen} onOk={() => { message.success('已保存'); setEditOpen(false); }} onCancel={() => setEditOpen(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="模板Key">
            <Input disabled />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select options={[{ value: 'activity', label: '活动' }, { value: 'payment', label: '支付' }, { value: 'system', label: '系统' }]} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={5} placeholder="支持 {{variable}} 变量" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
