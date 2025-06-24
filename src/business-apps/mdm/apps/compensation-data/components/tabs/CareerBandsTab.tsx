import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Button, Collapse, Tag, Space, Typography, InputNumber, Select, Form, Modal, message, Input, Spin, Alert } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PayGrade, JobLevelGroup, JobLevel } from './PayGradesTab';
import { useCompensationDataIntegration } from '../../hooks/useCompensationDataIntegration';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export interface CareerBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

interface JobLevelDetail extends JobLevel {
  payGrade: PayGrade;
  jobLevelGroup: JobLevelGroup;
  range: number;
}

const CareerBandsTab: React.FC<CareerBandsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  // Use real data integration
  const { payGrades, jobLevelGroups, jobLevels, isLoading, error, refetch } = useCompensationDataIntegration(context);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingJobLevel, setEditingJobLevel] = useState<JobLevel | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const formatCurrency = (amount: number, currency?: { id: string; value: string } | string) => {
    let currencyCode = typeof currency === 'string' ? currency : currency?.id || 'EUR';
    
    // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
    if (currencyCode.includes(':')) {
      const parts = currencyCode.split(':');
      currencyCode = parts[parts.length - 1]; // Get the last part
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getJobLevelDetails = (groupId: string): JobLevelDetail[] => {
    const group = jobLevelGroups.find(g => g.id === groupId);
    if (!group) return [];

    return jobLevels
      .filter(jl => jl.jobLevelGroupId === groupId)
      .map(jobLevel => {
        const payGrade = payGrades.find(pg => pg.id === jobLevel.payGradeId);
        if (!payGrade) return null;
        
        return {
          ...jobLevel,
          payGrade,
          jobLevelGroup: group,
          range: payGrade.maxSalary - payGrade.minSalary
        };
      })
      .filter(Boolean) as JobLevelDetail[];
  };

  const getGroupSummary = (groupId: string) => {
    const details = getJobLevelDetails(groupId);
    if (details.length === 0) return null;

    const minSalary = Math.min(...details.map(d => d.payGrade.minSalary));
    const maxSalary = Math.max(...details.map(d => d.payGrade.maxSalary));
    const currency = details[0]?.payGrade.currency || 'EUR';

    return {
      groupCount: details.length,
      salaryRange: `${formatCurrency(minSalary, currency)} - ${formatCurrency(maxSalary, currency)}`
    };
  };

  const handleEditJobLevel = (jobLevel: JobLevelDetail) => {
    setEditingJobLevel(jobLevel);
    form.setFieldsValue({
      name: jobLevel.name,
      code: jobLevel.code,
      payGradeId: jobLevel.payGradeId,
      level: jobLevel.level
    });
    setIsModalVisible(true);
  };

  const handleAddJobLevel = (groupId: string) => {
    setEditingJobLevel(null);
    setSelectedGroupId(groupId);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleDeleteJobLevel = (jobLevel: JobLevelDetail) => {
    Modal.confirm({
      title: 'Delete Job Level',
      content: `Are you sure you want to delete "${jobLevel.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        // TODO: Implement API call to delete job level
        message.warning('Delete functionality will be implemented with process API integration');
        // Optionally refetch data
        await refetch();
      },
    });
  };

  const handleSaveJobLevel = async () => {
    try {
      const values = await form.validateFields();
      
      // TODO: Implement API calls for saving job levels
      message.warning('Save functionality will be implemented with process API integration');
      
      setIsModalVisible(false);
      // Optionally refetch data
      await refetch();
    } catch (error) {
      console.error('Error saving job level:', error);
    }
  };

  if (isLoading) {
    return (
      <div data-testid={`${prefixDataTestId}-CareerBandsTab`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-CareerBandsTab`} className="gba:p-4">
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const columns = [
    {
      title: 'Levels',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Pay Grade',
      dataIndex: 'payGrade',
      key: 'payGrade',
      width: 120,
      render: (payGrade: PayGrade) => payGrade.code,
    },
    {
      title: 'Minimum',
      dataIndex: 'payGrade',
      key: 'minimum',
      width: 150,
      render: (payGrade: PayGrade) => formatCurrency(payGrade.minSalary, payGrade.currency),
    },
    {
      title: 'Standard',
      dataIndex: 'payGrade',
      key: 'standard',
      width: 150,
      render: (payGrade: PayGrade) => (
        <span className="gba:font-medium">
          {formatCurrency(payGrade.standardSalary, payGrade.currency)}
        </span>
      ),
    },
    {
      title: 'Maximum',
      dataIndex: 'payGrade',
      key: 'maximum',
      width: 150,
      render: (payGrade: PayGrade) => formatCurrency(payGrade.maxSalary, payGrade.currency),
    },
    {
      title: 'Range',
      dataIndex: 'range',
      key: 'range',
      width: 120,
      render: (range: number, record: JobLevelDetail) => 
        formatCurrency(range, record.payGrade.currency),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: JobLevelDetail) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditJobLevel(record)}
            size="small"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteJobLevel(record)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  return (
    <div data-testid={`${prefixDataTestId}-CareerBandsTab`}>
      <Card>
        <div className="gba:mb-4">
          <Title level={2}>Career Band Details</Title>
          <Text className="gba:text-gray-600">
            Detailed breakdown of compensation ranges for each career band and group
          </Text>
        </div>

        <Collapse 
          defaultActiveKey={jobLevelGroups.map(g => g.id)}
          expandIconPosition="start"
        >
          {jobLevelGroups.map((group) => {
            const summary = getGroupSummary(group.id);
            const jobLevelDetails = getJobLevelDetails(group.id);

            return (
              <Panel
                key={group.id}
                header={
                  <div className="gba:flex gba:justify-between gba:items-center gba:w-full gba:pr-4">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <span className="gba:font-medium gba:text-lg">{group.name}</span>
                      <span className="gba:text-gray-500">
                        {summary ? `${summary.groupCount} groups • ${summary.salaryRange}` : 'No data'}
                      </span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Tag color="blue">{summary?.groupCount || 0} groups</Tag>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle group edit
                        }}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle group delete
                        }}
                      />
                    </div>
                  </div>
                }
                extra={
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddJobLevel(group.id);
                    }}
                  >
                    Add Level
                  </Button>
                }
              >
                <Table
                  columns={columns}
                  dataSource={jobLevelDetails}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Panel>
            );
          })}
        </Collapse>
      </Card>

      {/* Add/Edit Job Level Modal */}
      <Modal
        title={editingJobLevel ? 'Edit Job Level' : 'Add New Job Level'}
        open={isModalVisible}
        onOk={handleSaveJobLevel}
        onCancel={() => setIsModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input the job level name!' }]}
          >
            <Input placeholder="e.g., Junior Developer, Senior Manager" />
          </Form.Item>

          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please input the job level code!' }]}
          >
            <Input placeholder="e.g., JD1, SM2" />
          </Form.Item>

          <Form.Item
            label="Pay Grade"
            name="payGradeId"
            rules={[{ required: true, message: 'Please select a pay grade!' }]}
          >
            <Select placeholder="Select pay grade">
              {payGrades.map(pg => (
                <Select.Option key={pg.id} value={pg.id}>
                  {pg.code} - {pg.name} ({formatCurrency(pg.minSalary, pg.currency)} - {formatCurrency(pg.maxSalary, pg.currency)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Level"
            name="level"
            rules={[{ required: true, message: 'Please input the level number!' }]}
          >
            <InputNumber 
              placeholder="1, 2, 3..."
              min={1}
              max={10}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CareerBandsTab;
export { CareerBandsTab }; 