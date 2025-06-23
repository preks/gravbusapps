import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, Modal, Form, Spin, Alert } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useJobFunctions } from '../../hooks/useJobFunctions';
import { JobFunction } from '../../types';

const { Title } = Typography;

export interface JobFunctionsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const JobFunctionsTab: React.FC<JobFunctionsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const { 
    jobFunctions, 
    totalCount, 
    isLoading, 
    error, 
    refetch,
    searchJobFunctions 
  } = useJobFunctions(context);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewingFunction, setViewingFunction] = useState<JobFunction | null>(null);
  const [form] = Form.useForm();

  const filteredFunctions = searchTerm 
    ? searchJobFunctions(searchTerm)
    : jobFunctions;

  const handleView = (record: JobFunction) => {
    setViewingFunction(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code || '',
      description: record.description || '',
      jobFamily: record.jobFamily?.value || 'Not assigned',
      jobLevelGroup: record.jobLevelGroup?.value || 'Not assigned',
    });
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setViewingFunction(null);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: JobFunction, b: JobFunction) => (a.code || '').localeCompare(b.code || ''),
      render: (code: string) => code || 'N/A'
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobFunction, b: JobFunction) => a.name.localeCompare(b.name),
    },
    {
      title: 'Job Family',
      dataIndex: ['jobFamily', 'value'],
      key: 'jobFamily',
      width: 150,
      render: (value: string) => value || 'Not assigned',
    },
    {
      title: 'Job Level Group',
      dataIndex: ['jobLevelGroup', 'value'],
      key: 'jobLevelGroup',
      width: 150,
      render: (value: string) => value || 'Not assigned',
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
      render: (_: any, record: JobFunction) => (
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
          message="Error Loading Job Functions"
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
      data-testid={`${prefixDataTestId || ''}-JobFunctionsTab`}
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
            {t('hr.job_functions', 'Job Functions')} ({totalCount})
          </Title>
        </div>
        
        <Input
          placeholder="Search job functions..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-SearchInput`}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredFunctions}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} job functions`,
          }}
          data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-Table`}
          style={{ background: 'white', borderRadius: '8px' }}
        />
      )}

      <Modal
        title="Job Function Details"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button key="close" onClick={handleModalCancel}>
            Close
          </Button>
        ]}
        width={600}
        data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-Form`}
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
            <Form.Item label="Job Family" name="jobFamily">
              <Input disabled />
            </Form.Item>
            
            <Form.Item label="Job Level Group" name="jobLevelGroup">
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

export { JobFunctionsTab }; 