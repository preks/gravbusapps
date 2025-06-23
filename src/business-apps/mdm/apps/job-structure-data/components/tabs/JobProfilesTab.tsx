import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, Modal, Form, Spin, Alert, Tag } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useJobProfiles } from '../../hooks/useJobProfiles';
import { JobProfile } from '../../types';

const { Title } = Typography;

export interface JobProfilesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const JobProfilesTab: React.FC<JobProfilesTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const { 
    jobProfiles, 
    totalCount, 
    isLoading, 
    error, 
    refetch,
    searchJobProfiles 
  } = useJobProfiles(context);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<JobProfile | null>(null);
  const [form] = Form.useForm();

  const filteredProfiles = searchTerm 
    ? searchJobProfiles(searchTerm)
    : jobProfiles;

  const handleView = (record: JobProfile) => {
    setViewingProfile(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code || '',
      description: record.description || '',
      jobFunction: record.jobFunction?.name || 'Not assigned',
      jobLevel: record.jobLevel?.name || 'Not assigned',
      contractType: record.contractType?.value || 'Not assigned',
      employmentType: record.employmentType?.value || 'Not assigned',
      recordState: record.recordState || 'Unknown',
      version: record.version || 'N/A',
    });
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setViewingProfile(null);
  };

  const getStatusColor = (recordState?: string) => {
    switch (recordState) {
      case 'active': return 'green';
      case 'inactive': return 'red';
      case 'draft': return 'orange';
      default: return 'gray';
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: JobProfile, b: JobProfile) => (a.code || '').localeCompare(b.code || ''),
      render: (code: string) => code || 'N/A'
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobProfile, b: JobProfile) => a.name.localeCompare(b.name),
    },
    {
      title: 'Job Function',
      dataIndex: ['jobFunction', 'name'],
      key: 'jobFunction',
      width: 150,
      render: (name: string) => name || 'Not assigned',
    },
    {
      title: 'Job Level',
      dataIndex: ['jobLevel', 'name'],
      key: 'jobLevel',
      width: 150,
      render: (name: string) => name || 'Not assigned',
    },
    {
      title: 'Contract Type',
      dataIndex: ['contractType', 'value'],
      key: 'contractType',
      width: 180,
      render: (value: string) => value || 'Not assigned',
    },
    {
      title: 'Employment Type',
      dataIndex: ['employmentType', 'value'],
      key: 'employmentType',
      width: 150,
      render: (value: string) => value || 'Not assigned',
    },
    {
      title: 'Status',
      dataIndex: 'recordState',
      key: 'recordState',
      width: 100,
      render: (recordState: string) => (
        <Tag color={getStatusColor(recordState)}>
          {recordState ? recordState.charAt(0).toUpperCase() + recordState.slice(1) : 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || 'No description',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: JobProfile) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
          title="View Details"
        />
      ),
    },
  ];

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Job Profiles"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-JobProfilesTab`}
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
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            {t('hr.job_profiles', 'Job Profiles')} ({totalCount})
          </Title>
        </div>
        
        <Input
          placeholder="Search job profiles..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-JobProfilesTab-SearchInput`}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredProfiles}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} job profiles`,
          }}
          data-testid={`${prefixDataTestId || ''}-JobProfilesTab-Table`}
          style={{ background: 'white', borderRadius: '8px' }}
          scroll={{ x: 1200 }} // Enable horizontal scroll for wider table
        />
      )}

      <Modal
        title="Job Profile Details"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button key="close" onClick={handleModalCancel}>
            Close
          </Button>
        ]}
        width={700}
        data-testid={`${prefixDataTestId || ''}-JobProfilesTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-JobProfilesTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Name" name="name">
              <Input disabled />
            </Form.Item>
            
            <Form.Item label="Code" name="code">
              <Input disabled />
            </Form.Item>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Job Function" name="jobFunction">
              <Input disabled />
            </Form.Item>
            
            <Form.Item label="Job Level" name="jobLevel">
              <Input disabled />
            </Form.Item>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Contract Type" name="contractType">
              <Input disabled />
            </Form.Item>
            
            <Form.Item label="Employment Type" name="employmentType">
              <Input disabled />
            </Form.Item>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Status" name="recordState">
              <Input disabled />
            </Form.Item>
            
            <Form.Item label="Version" name="version">
              <Input disabled />
            </Form.Item>
          </div>
          
          <Form.Item label="Description" name="description">
            <Input.TextArea disabled rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { JobProfilesTab }; 