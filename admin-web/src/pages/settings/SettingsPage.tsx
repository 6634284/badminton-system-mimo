import { Card, Input, Switch, message, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SystemConfig } from '../../services/api/settings';

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await settingsApi.list();
      return data.data;
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => settingsApi.update(key, value),
    onSuccess: () => {
      message.success('保存成功');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  if (isLoading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const grouped = (configs || []).reduce<Record<string, SystemConfig[]>>((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    cancel: '取消规则',
    payment: '支付设置',
    registration: '报名设置',
    notification: '通知设置',
    general: '基本设置',
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} title={categoryLabels[category] || category} style={{ marginBottom: 16 }}>
          {items.map((item) => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{item.description || item.key}</div>
                <div style={{ color: '#999', fontSize: 12 }}>{item.key}</div>
              </div>
              {item.value === 'true' || item.value === 'false' ? (
                <Switch
                  checked={item.value === 'true'}
                  onChange={(checked) => updateMut.mutate({ key: item.key, value: String(checked) })}
                />
              ) : (
                <Input
                  defaultValue={item.value}
                  style={{ width: 200 }}
                  onBlur={(e) => {
                    if (e.target.value !== item.value) {
                      updateMut.mutate({ key: item.key, value: e.target.value });
                    }
                  }}
                />
              )}
            </div>
          ))}
        </Card>
      ))}
      {Object.keys(grouped).length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无配置项</div>
        </Card>
      )}
    </div>
  );
}
