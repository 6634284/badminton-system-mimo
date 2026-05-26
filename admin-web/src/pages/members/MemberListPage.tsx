import { useState } from 'react';
import { Table, Button, Tag, Input, Switch, Drawer, Descriptions, message, Modal, Upload, Progress, Space, Alert } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useMemberList, useUpdateMember, useMemberCards } from '../../hooks';
import http from '../../services/http';

export default function MemberListPage() {
  const [query, setQuery] = useState<any>({ page: 1, pageSize: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState<any>(null);
  const [_importJobId, setImportJobId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useMemberList(query);
  const { data: cards } = useMemberCards(selectedId || '');
  const updateMut = useUpdateMember();

  const columns = [
    { title: '会员号', dataIndex: 'member_no', key: 'member_no' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
    { title: '等级', dataIndex: 'level', key: 'level', render: (v: number) => `Lv.${v}` },
    { title: '积分', dataIndex: 'points', key: 'points' },
    { title: '消费总额', dataIndex: 'total_spent_amount', key: 'total_spent_amount', render: (v: string) => `¥${v}` },
    {
      title: '黑名单', dataIndex: 'blacklisted', key: 'blacklisted',
      render: (v: boolean) => v ? <Tag color="red">黑名单</Tag> : <Tag color="green">正常</Tag>,
    },
    { title: '加入时间', dataIndex: 'joined_at', key: 'joined_at', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Button size="small" onClick={() => { setSelectedId(record.id); setDrawerOpen(true); }}>
          详情
        </Button>
      ),
    },
  ];

  const handleBlacklist = async (memberId: string, blacklisted: boolean) => {
    await updateMut.mutateAsync({ id: memberId, blacklisted });
    message.success(blacklisted ? '已拉黑' : '已取消拉黑');
  };

  const handleImport = async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await http.post('/members/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.data?.job_id) {
        setImportJobId(data.data.job_id);
        pollImportStatus(data.data.job_id);
      } else {
        message.success(`导入完成: ${data.data?.success || 0} 条成功`);
        refetch();
        setImportModal(false);
      }
    } catch {
      message.error('导入失败');
    }
    return false;
  };

  const pollImportStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await http.get(`/members/import/status/${jobId}`);
        setImportProgress(data.data);
        if (data.data?.status === 'completed') {
          clearInterval(interval);
          message.success(`导入完成: ${data.data.result?.success || 0} 条成功, ${data.data.result?.failed || 0} 条失败`);
          refetch();
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  const downloadTemplate = async () => {
    try {
      const { data } = await http.get('/members/import/template');
      const headers = data.data?.headers || ['姓名', '手机号', '性别', '身份证号', '紧急联系人', '紧急联系电话'];
      const sample = data.data?.sample || [];
      const csv = [headers.join(','), ...sample.map((r: any) => Object.values(r).join(','))].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '会员导入模板.csv';
      a.click();
    } catch {
      message.error('下载模板失败');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="搜索会员号/昵称" style={{ width: 300 }} onSearch={(v) => setQuery({ ...query, keyword: v })} />
        <Space>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>下载模板</Button>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setImportModal(true)}>批量导入</Button>
        </Space>
      </div>

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

      <Drawer title="会员详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={600}>
        {selectedId && (
          <div>
            <Descriptions column={1} bordered style={{ marginBottom: 24 }}>
              {(() => {
                const member = data?.list?.find((m: any) => m.id === selectedId);
                if (!member) return null;
                return (
                  <>
                    <Descriptions.Item label="会员号">{member.member_no}</Descriptions.Item>
                    <Descriptions.Item label="昵称">{member.nickname}</Descriptions.Item>
                    <Descriptions.Item label="等级">Lv.{member.level}</Descriptions.Item>
                    <Descriptions.Item label="积分">{member.points}</Descriptions.Item>
                    <Descriptions.Item label="消费总额">¥{member.total_spent_amount}</Descriptions.Item>
                    <Descriptions.Item label="加入时间">{new Date(member.joined_at).toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="拉黑">
                      <Switch checked={member.blacklisted} onChange={(v) => handleBlacklist(selectedId, v)} />
                    </Descriptions.Item>
                  </>
                );
              })()}
            </Descriptions>

            <h4>会员卡</h4>
            <Table
              dataSource={cards || []}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: '卡名', dataIndex: 'card_name' },
                { title: '类型', dataIndex: 'card_type' },
                { title: '使用次数', render: (_: any, r: any) => `${r.used_count}/${r.total_count || '∞'}` },
                { title: '状态', dataIndex: 'status' },
              ]}
            />
          </div>
        )}
      </Drawer>

      <Modal title="批量导入会员" open={importModal} onCancel={() => { setImportModal(false); setImportProgress(null); }} footer={null}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert message="请使用CSV格式，包含：姓名、手机号、性别、身份证号、紧急联系人、紧急联系电话" type="info" />
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv,.xlsx,.xls">
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
          {importProgress && (
            <div>
              <Progress percent={Math.round((importProgress.progress / importProgress.total) * 100)} />
              <p>状态: {importProgress.status === 'completed' ? '已完成' : '导入中...'} ({importProgress.progress}/{importProgress.total})</p>
              {importProgress.result && (
                <p>成功: {importProgress.result.success} | 失败: {importProgress.result.failed}</p>
              )}
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
}
