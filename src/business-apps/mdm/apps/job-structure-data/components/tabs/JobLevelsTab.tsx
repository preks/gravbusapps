import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Tag, Spin, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useJobStructureDataIntegration, EnhancedJobLevel, EnhancedJobLevelGroup } from '../../hooks';

const { Title } = Typography;

export interface JobLevelsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Re-export types for external usage
export type { EnhancedJobLevel as JobLevel, EnhancedJobLevelGroup as JobLevelGroup } from '../../hooks';

const JobLevelsTab: React.FC<JobLevelsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  // Use real data integration
  const { jobLevelGroups, isLoading, error, refetch } = useJobStructureDataIntegration(context);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EnhancedJobLevelGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  const filteredGroups = jobLevelGroups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExpand = (expanded: boolean, record: EnhancedJobLevelGroup) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(record.id);
      } else {
        newSet.delete(record.id);
      }
      return newSet;
    });
  };

  const handleAdd = () => {
    setEditingGroup(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: EnhancedJobLevelGroup) => {
    setEditingGroup(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      category: record.category,
      isActive: record.isActive,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: EnhancedJobLevelGroup) => {
    Modal.confirm({
      title: 'Delete Job Level Group',
      content: `Are you sure you want to delete "${record.name}"? This will also delete all associated job levels.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        // TODO: Implement API call to delete job level group
        message.warning('Delete functionality will be implemented with process API integration');
        // Optionally refetch data
        await refetch();
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // TODO: Implement API calls for saving job level groups
      message.warning('Save functionality will be implemented with process API integration');
      
      setIsModalVisible(false);
      // Optionally refetch data
      await refetch();
    } catch (error) {
      console.error('Error saving job level group:', error);
      message.error('Failed to save job level group');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const expandedRowRender = (record: EnhancedJobLevelGroup) => {
    const levelColumns = [
      {
        title: 'Level',
        dataIndex: 'level',
        key: 'level',
        width: 80,
      },
      {
        title: 'Code',
        dataIndex: 'code',
        key: 'code',
        width: 100,
      },
      {
        title: 'Name',
        dataIndex: 'displayName',
        key: 'displayName',
      },
      {
        title: 'Compensation Band',
        key: 'compensationBand',
        width: 150,
        render: (_: any, jobLevel: EnhancedJobLevel) => (
          jobLevel.compensationBand ? (
            <Tag color="green">{jobLevel.compensationBand.name}</Tag>
          ) : (
            <Tag color="gray">Not assigned</Tag>
          )
        ),
      },
      {
        title: 'Experience',
        dataIndex: 'experienceYears',
        key: 'experienceYears',
        width: 120,
        render: (years?: number) => years ? `${years} years` : 'N/A',
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
    ];

    return (
      <div style={{ margin: '16px 0', background: '#fafafa', padding: '16px', borderRadius: '6px' }}>
        <Title level={5} style={{ marginTop: 0, color: '#666' }}>
          Job Levels in {record.name} ({record.jobLevelCount} levels)
        </Title>
        {record.jobLevels.length > 0 ? (
          <Table
            columns={levelColumns}
            dataSource={record.jobLevels}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ background: 'white' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            No job levels defined for this group
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: EnhancedJobLevelGroup, b: EnhancedJobLevelGroup) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: EnhancedJobLevelGroup, b: EnhancedJobLevelGroup) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: (a: EnhancedJobLevelGroup, b: EnhancedJobLevelGroup) => a.category.localeCompare(b.category),
    },
    {
      title: 'Job Levels',
      key: 'jobLevelsCount',
      width: 120,
      render: (_: any, record: EnhancedJobLevelGroup) => (
        <Tag color="blue">{record.jobLevelCount} levels</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <span style={{ 
          color: isActive ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: EnhancedJobLevelGroup) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
            danger
          />
        </Space>
      ),
    },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId || ''}-JobLevelsTab`}
        style={{ 
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId || ''}-JobLevelsTab`}
        style={{ 
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px'
        }}
      >
        <Alert
          message="Error Loading Job Structure Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-JobLevelsTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
              {t('hr.job_levels', 'Job Levels')}
            </Title>
            <Tag color="blue">{jobLevelGroups.length} groups</Tag>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-JobLevelsTab-AddButton`}
          >
            Add Job Level Group
          </Button>
        </div>
        
        <Input
          placeholder="Search job level groups..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-JobLevelsTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredGroups}
        rowKey="id"
        loading={isLoading}
        expandable={{
          expandedRowRender,
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              size="small"
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              onClick={(e) => onExpand(record, e)}
            />
          ),
          onExpand: handleExpand,
          expandedRowKeys: Array.from(expandedGroups),
        }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} job level groups`,
        }}
        data-testid={`${prefixDataTestId || ''}-JobLevelsTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
      />

      <Modal
        title={editingGroup ? 'Edit Job Level Group' : 'Add Job Level Group'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-JobLevelsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-JobLevelsTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Enter job level group name" />
            </Form.Item>
            
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter job level group code" />
            </Form.Item>
          </div>
          
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please enter a category' }]}
          >
            <Input placeholder="Enter category" />
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter description (optional)" 
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            label="Status"
            name="isActive"
            valuePropName="checked"
          >
            <input type="checkbox" />
            <span style={{ marginLeft: '8px' }}>Active</span>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { JobLevelsTab }; 