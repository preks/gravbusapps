import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Spin, InputNumber, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useUserLocale } from '@/common/locale/useUserLocale';

const { Title } = Typography;

export interface CompensationBand {
  id: string;
  name: string;
  payGrade: number;
  minSalary: number;
  maxSalary: number;
  currency: string;
  description?: string;
  version?: number;
}

export interface CompensationBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration - in real implementation this would come from API
const mockCompensationBands: CompensationBand[] = [
  {
    id: '1',
    name: 'Entry Level',
    payGrade: 1,
    minSalary: 35000,
    maxSalary: 45000,
    currency: 'EUR',
    description: 'Entry level compensation band for new graduates',
    version: 1
  },
  {
    id: '2', 
    name: 'Junior',
    payGrade: 2,
    minSalary: 40000,
    maxSalary: 55000,
    currency: 'EUR',
    description: 'Junior level compensation band',
    version: 1
  },
  {
    id: '3',
    name: 'Mid-Level',
    payGrade: 3,
    minSalary: 50000,
    maxSalary: 70000,
    currency: 'EUR',
    description: 'Mid-level compensation band',
    version: 1
  },
  {
    id: '4',
    name: 'Senior',
    payGrade: 4,
    minSalary: 65000,
    maxSalary: 90000,
    currency: 'EUR',
    description: 'Senior level compensation band',
    version: 1
  },
  {
    id: '5',
    name: 'Lead',
    payGrade: 5,
    minSalary: 80000,
    maxSalary: 120000,
    currency: 'EUR',
    description: 'Lead level compensation band',
    version: 1
  }
];

const currencies = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' }
];

const CompensationBandsTab: React.FC<CompensationBandsTabProps> = ({ 
  accessToken, 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale() ?? 'en-US';
  
  const [compensationBands, setCompensationBands] = useState<CompensationBand[]>(mockCompensationBands);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBand, setEditingBand] = useState<CompensationBand | null>(null);
  const [form] = Form.useForm();

  const filteredBands = compensationBands.filter(band => 
    band.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    band.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    band.payGrade.toString().includes(searchTerm)
  );

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleAdd = () => {
    setEditingBand(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: CompensationBand) => {
    setEditingBand(record);
    form.setFieldsValue({
      name: record.name,
      payGrade: record.payGrade,
      minSalary: record.minSalary,
      maxSalary: record.maxSalary,
      currency: record.currency,
      description: record.description,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: CompensationBand) => {
    Modal.confirm({
      title: 'Delete Compensation Band',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // In real implementation, this would call the API
          setCompensationBands(prev => prev.filter(band => band.id !== record.id));
          message.success('Compensation band deleted successfully');
        } catch (error) {
          console.error('Error deleting compensation band:', error);
          message.error('Failed to delete compensation band');
        }
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
      
      if (editingBand) {
        // Update existing band
        setCompensationBands(prev => 
          prev.map(band => 
            band.id === editingBand.id 
              ? { ...band, ...values }
              : band
          )
        );
        message.success('Compensation band updated successfully');
      } else {
        // Create new band
        const newBand: CompensationBand = {
          id: Date.now().toString(),
          ...values,
          version: 1
        };
        setCompensationBands(prev => [...prev, newBand]);
        message.success('Compensation band created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving compensation band:', error);
      message.error('Failed to save compensation band');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Pay Grade',
      dataIndex: 'payGrade',
      key: 'payGrade',
      width: 100,
      sorter: (a: CompensationBand, b: CompensationBand) => a.payGrade - b.payGrade,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: CompensationBand, b: CompensationBand) => a.name.localeCompare(b.name),
    },
    {
      title: 'Salary Range',
      key: 'salaryRange',
      render: (_: any, record: CompensationBand) => (
        <span>
          {formatCurrency(record.minSalary, record.currency)} - {formatCurrency(record.maxSalary, record.currency)}
        </span>
      ),
      sorter: (a: CompensationBand, b: CompensationBand) => a.minSalary - b.minSalary,
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: CompensationBand) => (
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
    <div
      data-testid={`${prefixDataTestId || ''}-CompensationBandsTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            {t('hr.compensation_bands', 'Compensation Bands')}
          </Title>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
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
      )}

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
            label="Pay Grade"
            name="payGrade"
            rules={[{ required: true, message: 'Please enter a pay grade' }]}
          >
            <InputNumber 
              placeholder="Enter pay grade" 
              min={1} 
              max={20}
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Minimum Salary"
              name="minSalary"
              rules={[{ required: true, message: 'Please enter minimum salary' }]}
            >
              <InputNumber 
                placeholder="Min salary" 
                min={0}
                style={{ width: '100%' }}
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
              />
            </Form.Item>
            
            <Form.Item
              label="Currency"
              name="currency"
              rules={[{ required: true, message: 'Please select a currency' }]}
            >
              <Select placeholder="Select currency">
                {currencies.map(currency => (
                  <Select.Option key={currency.value} value={currency.value}>
                    {currency.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter description (optional)" 
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { CompensationBandsTab }; 