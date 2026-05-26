import { useState } from 'react';
import { Table, Tag, Drawer, Button } from 'antd';
import { useWalletList, useWalletTransactions } from '../../hooks';

export default function WalletListPage() {
  const [query, setQuery] = useState<any>({ page: 1, pageSize: 20 });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useWalletList(query);
  const { data: txs } = useWalletTransactions(selectedUserId || '', { page: 1, pageSize: 50 });

  const columns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '现金余额', dataIndex: 'cash_balance', key: 'cash_balance', render: (v: string) => `¥${v}` },
    { title: '赠送余额', dataIndex: 'gift_balance', key: 'gift_balance', render: (v: string) => `¥${v}` },
    { title: '冻结余额', dataIndex: 'frozen_balance', key: 'frozen_balance', render: (v: string) => `¥${v}` },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => { setSelectedUserId(record.user_id); setDrawerOpen(true); }}>
          明细
        </Button>
      ),
    },
  ];

  const txColumns = [
    { title: '方向', dataIndex: 'direction', key: 'direction', render: (v: string) => <Tag color={v === 'C' ? 'green' : 'red'}>{v === 'C' ? '入账' : '扣款'}</Tag> },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: string) => `¥${v}` },
    { title: '子账户', dataIndex: 'sub_account', key: 'sub_account' },
    { title: '业务类型', dataIndex: 'biz_type', key: 'biz_type' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    { title: '时间', dataIndex: 'occurred_at', key: 'occurred_at', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={data?.list || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.total,
          onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
        }}
      />

      <Drawer title="交易明细" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={800}>
        <Table
          columns={txColumns}
          dataSource={txs?.list || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Drawer>
    </div>
  );
}
