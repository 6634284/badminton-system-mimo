import { useEffect } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Tag, Alert, Space, Divider } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import http from '../../services/http';

export default function WechatPayPage() {
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['wechat-pay-config'],
    queryFn: async () => {
      try {
        const { data } = await http.get('/settings/wechat-pay');
        return data.data;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    }
  }, [config]);

  const saveMut = useMutation({
    mutationFn: (values: any) => http.post('/settings/wechat-pay', values),
    onSuccess: () => { message.success('配置已保存'); qc.invalidateQueries({ queryKey: ['wechat-pay-config'] }); },
    onError: () => message.error('保存失败'),
  });

  const testMut = useMutation({
    mutationFn: () => http.post('/settings/wechat-pay/test'),
    onSuccess: () => message.success('连接测试成功'),
    onError: () => message.error('连接测试失败'),
  });

  return (
    <div>
      <h2>微信支付配置</h2>

      <Alert
        message="配置说明"
        description="请填入微信支付商户平台的配置信息。配置完成后可进行连接测试。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="商户配置">
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)}>
          <Form.Item name="mch_id" label="商户号" rules={[{ required: true }]}>
            <Input placeholder="微信支付商户号" />
          </Form.Item>
          <Form.Item name="serial_no" label="证书序列号" rules={[{ required: true }]}>
            <Input placeholder="商户API证书序列号" />
          </Form.Item>
          <Form.Item name="api_v3_key" label="APIv3密钥" rules={[{ required: true }]}>
            <Input.Password placeholder="微信支付APIv3密钥" />
          </Form.Item>
          <Form.Item name="notify_url" label="回调地址" rules={[{ required: true }]}>
            <Input placeholder="https://your-domain.com/api/open/v1/payments/wechat/notify" />
          </Form.Item>
          <Form.Item name="refund_notify_url" label="退款回调地址">
            <Input placeholder="https://your-domain.com/api/open/v1/payments/wechat/refund-notify" />
          </Form.Item>

          <Divider />

          <Form.Item name="app_id" label="小程序AppID" rules={[{ required: true }]}>
            <Input placeholder="微信小程序AppID" />
          </Form.Item>
          <Form.Item name="app_secret" label="小程序AppSecret" rules={[{ required: true }]}>
            <Input.Password placeholder="微信小程序AppSecret" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saveMut.isPending}>保存配置</Button>
              <Button onClick={() => testMut.mutate()} loading={testMut.isPending}>连接测试</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="当前状态" style={{ marginTop: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="商户号">{config?.mch_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="证书序列号">{config?.serial_no ? '****' + config.serial_no.slice(-4) : '-'}</Descriptions.Item>
          <Descriptions.Item label="回调地址">{config?.notify_url || '-'}</Descriptions.Item>
          <Descriptions.Item label="配置状态">
            {config?.mch_id ? <Tag color="green">已配置</Tag> : <Tag color="red">未配置</Tag>}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
