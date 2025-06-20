import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Spin, InputNumber, Select, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useUserLocale } from '@/common/locale/useUserLocale';
import { useCompensationDataIntegration } from '../../hooks/useCompensationDataIntegration';
import { PayGrade } from './PayGradesTab';

const { Title } = Typography;

export interface CompensationBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const currencies = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' }
];

const CompensationBandsTab: React.FC<CompensationBandsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  const userLocale = useUserLocale() ?? 'en-US';
  
  // Use real data integration
  const { payGrades, isLoading, error, refetch } = useCompensationDataIntegration(context);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBand, setEditingBand] = useState<PayGrade | null>(null);
  const [form] = Form.useForm();

  const filteredBands = payGrades.filter(band => 
    band.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    band.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency?: { id: string; value: string } | string) => {
    let currencyCode = typeof currency === 'string' ? currency : currency?.id || 'EUR';
    
    // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
    if (currencyCode.includes(':')) {
      const parts = currencyCode.split(':');
      currencyCode = parts[parts.length - 1]; // Get the last part
    }
    
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAdd = () => {
    setEditingBand(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: PayGrade) => {
    setEditingBand(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      minSalary: record.minSalary,
      maxSalary: record.maxSalary,
      standardSalary: record.standardSalary,
      currency: typeof record.currency === 'string' ? record.currency : record.currency?.id,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: PayGrade) => {
    Modal.confirm({
      title: 'Delete Compensation Band',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        // TODO: Implement API call to delete compensation band
        message.warning('Delete functionality will be implemented with process API integration');
        // Optionally refetch data
        await refetch();
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Validate salary range
      if (values.minSalary >= values.maxSalary) {
        message.error('Minimum salary must be less than maximum salary');
        return;
      }
      
      if (values.standardSalary < values.minSalary || values.standardSalary > values.maxSalary) {
        message.error('Standard salary must be between minimum and maximum salary');
        return;
      }
      
      // TODO: Implement API calls for saving compensation bands
      message.warning('Save functionality will be implemented with process API integration');
      
      setIsModalVisible(false);
      // Optionally refetch data
      await refetch();
    } catch (error) {
      console.error('Error saving compensation band:', error);
      message.error('Failed to save compensation band');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  if (isLoading) {
    return (
      <div data-testid={`${prefixDataTestId}-CompensationBandsTab`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-CompensationBandsTab`} className="gba:p-4">
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
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: PayGrade, b: PayGrade) => (a.code || '').localeCompare(b.code || ''),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: PayGrade, b: PayGrade) => a.name.localeCompare(b.name),
    },
    {
      title: 'Minimum Salary',
      key: 'minSalary',
      width: 150,
      render: (_: any, record: PayGrade) => formatCurrency(record.minSalary, record.currency),
      sorter: (a: PayGrade, b: PayGrade) => a.minSalary - b.minSalary,
    },
    {
      title: 'Standard Salary',
      key: 'standardSalary',
      width: 150,
      render: (_: any, record: PayGrade) => (
        <span className="gba:font-medium">
          {formatCurrency(record.standardSalary, record.currency)}
        </span>
      ),
      sorter: (a: PayGrade, b: PayGrade) => a.standardSalary - b.standardSalary,
    },
    {
      title: 'Maximum Salary',
      key: 'maxSalary',
      width: 150,
      render: (_: any, record: PayGrade) => formatCurrency(record.maxSalary, record.currency),
      sorter: (a: PayGrade, b: PayGrade) => a.maxSalary - b.maxSalary,
    },
    {
      title: 'Range',
      key: 'range',
      width: 150,
      render: (_: any, record: PayGrade) => formatCurrency(record.maxSalary - record.minSalary, record.currency),
      sorter: (a: PayGrade, b: PayGrade) => (a.maxSalary - a.minSalary) - (b.maxSalary - b.minSalary),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: PayGrade) => (
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

  return (
    <div data-testid={`${prefixDataTestId || ''}-CompensationBandsTab`} className="gba:p-6">
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <Title level={2} className="gba:mb-2">Compensation Bands</Title>
            <p className="gba:text-gray-600">
              Manage compensation bands and salary ranges for different pay grades
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-CompensationBandsTab-AddButton`}
          >
            Add Compensation Band
          </Button>
        </div>
        
        <Input
          placeholder="Search compensation bands..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-CompensationBandsTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredBands}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} compensation bands`,
        }}
        data-testid={`${prefixDataTestId || ''}-CompensationBandsTab-Table`}
      />

      <Modal
        title={editingBand ? 'Edit Compensation Band' : 'Add Compensation Band'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-CompensationBandsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-CompensationBandsTab-Form`}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Enter compensation band name" />
          </Form.Item>
          
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please enter a code' }]}
          >
            <Input placeholder="Enter pay grade code (e.g., K/T7, AT4)" />
          </Form.Item>
          
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <Form.Item
              label="Minimum Salary"
              name="minSalary"
              rules={[{ required: true, message: 'Please enter minimum salary' }]}
            >
              <InputNumber 
                placeholder="Min salary" 
                min={0}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
            
            <Form.Item
              label="Standard Salary"
              name="standardSalary"
              rules={[{ required: true, message: 'Please enter standard salary' }]}
            >
              <InputNumber 
                placeholder="Standard salary" 
                min={0}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
            
            <Form.Item
              label="Maximum Salary"
              name="maxSalary"
              rules={[{ required: true, message: 'Please enter maximum salary' }]}
            >
              <InputNumber 
                placeholder="Max salary" 
                min={0}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </div>
          
          <Form.Item
            label="Currency"
            name="currency"
            rules={[{ required: true, message: 'Please select a currency' }]}
            initialValue="EUR"
          >
            <Select placeholder="Select currency">
              {currencies.map(currency => (
                <Select.Option key={currency.value} value={currency.value}>
                  {currency.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompensationBandsTab;
export { CompensationBandsTab }; 