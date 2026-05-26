import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Select, message, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useStaffList, useCreateStaff, useUpdateStaffRole, useUpdateStaffStatus } from '../../hooks/useStaff';

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'orange',
  left: 'red',
};

const statusLabels: Record<string, string> = {
  active: '在职',
  inactive: '停用',
  left: '离职',
};

export default function StaffPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useStaffList({ page, pageSize: 20, keyword });
  const createMut = useCreateStaff();
  const updateRoleMut = useUpdateStaffRole();
  const updateStatusMut = useUpdateStaffStatus();

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      await createMut.mutateAsync(values);
      message.success('添加成功');
      setAddOpen(false);
      form.resetFields();
    } catch {
      // validation error
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    Modal.confirm({
      title: `确认${status === 'left' ? '离职' : '停用'}该人员？`,
      onOk: async () => {
        await updateStatusMut.mutateAsync({ id, status });
        message.success('操作成功');
      },
    });
  };

  const columns = [
    { title: '姓名', dataIndex: 'username', key: 'username' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '角色', dataIndex: 'role_name', key: 'role_name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    {
      title: '是否负责人',
      dataIndex: 'is_owner',
      key: 'is_owner',
      render: (v: boolean) => v ? <Tag color="blue">负责人</Tag> : '-',
    },
    { title: '入职时间', dataIndex: 'joined_at', key: 'joined_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {!record.is_owner && (
            <>
              <Select
                size="small"
                value={record.role_id}
                style={{ width: 100 }}
                onChange={(roleId) => updateRoleMut.mutate({ id: record.id, roleId })}
                options={[
                  { value: '1', label: '管理员' },
                  { value: '2', label: '教练' },
                  { value: '3', label: '前台' },
                ]}
              />
              {record.status === 'active' && (
                <Button size="small" danger onClick={() => handleStatusChange(record.id, 'left')}>
                  离职
                </Button>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder="搜索姓名/手机号"
          style={{ width: 300 }}
          onSearch={(v) => { setKeyword(v); setPage(1); }}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          添加人员
        </Button>
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

      <Modal title="添加人员" open={addOpen} onOk={handleAdd} onCancel={() => setAddOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="用户ID" rules={[{ required: true }]}>
            <Input placeholder="输入用户ID" />
          </Form.Item>
          <Form.Item name="roleId" label="角色" rules={[{ required: true }]}>
            <Select
              options={[
                { value: '1', label: '管理员' },
                { value: '2', label: '教练' },
                { value: '3', label: '前台' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
