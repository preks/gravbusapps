import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, BankOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;
const { Option } = Select;

export interface Company {
  id: string;
  name: string;
  code: string;
  legalName: string;
  industry: string;
  size: string;
  founded: string;
  headquarters: string;
  website?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  legalForm: string;
  vatId?: string;
  registrationNumber?: string;
}

export interface CompaniesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'NEWWORK SE',
    code: 'NWSE',
    legalName: 'NEWWORK SE',
    industry: 'Technology',
    size: '1000-5000',
    founded: '2006',
    headquarters: 'Hamburg, Germany',
    website: 'https://www.new-work.se',
    description: 'Leading platform for work and career in the German-speaking region',
    status: 'Active',
    legalForm: 'SE (Societas Europaea)',
    vatId: 'DE123456789',
    registrationNumber: 'HRB 123456'
  },
  {
    id: '2',
    name: 'XING GmbH',
    code: 'XING',
    legalName: 'XING GmbH',
    industry: 'Technology',
    size: '500-1000',
    founded: '2003',
    headquarters: 'Hamburg, Germany',
    website: 'https://www.xing.com',
    description: 'Professional networking platform',
    status: 'Active',
    legalForm: 'GmbH',
    vatId: 'DE987654321',
    registrationNumber: 'HRB 654321'
  },
  {
    id: '3',
    name: 'kununu GmbH',
    code: 'KUNUNU',
    legalName: 'kununu GmbH',
    industry: 'Technology',
    size: '100-500',
    founded: '2007',
    headquarters: 'Vienna, Austria',
    website: 'https://www.kununu.com',
    description: 'Employer rating and company culture platform',
    status: 'Active',
    legalForm: 'GmbH',
    vatId: 'AT123456789',
    registrationNumber: 'FN 123456a'
  },
  {
    id: '4',
    name: 'honeypot GmbH',
    code: 'HONEY',
    legalName: 'honeypot GmbH',
    industry: 'Technology',
    size: '50-100',
    founded: '2015',
    headquarters: 'Berlin, Germany',
    website: 'https://www.honeypot.io',
    description: 'Developer-focused job platform',
    status: 'Active',
    legalForm: 'GmbH',
    vatId: 'DE555666777',
    registrationNumber: 'HRB 789012'
  },
  {
    id: '5',
    name: 'XING Events GmbH',
    code: 'XEVENTS',
    legalName: 'XING Events GmbH',
    industry: 'Technology',
    size: '10-50',
    founded: '2012',
    headquarters: 'Hamburg, Germany',
    website: 'https://www.xing-events.com',
    description: 'Event management and ticketing platform',
    status: 'Inactive',
    legalForm: 'GmbH',
    vatId: 'DE111222333',
    registrationNumber: 'HRB 345678'
  }
];

const CompaniesTab: React.FC<CompaniesTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form] = Form.useForm();

  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.headquarters.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingCompany(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Company) => {
    setEditingCompany(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      legalName: record.legalName,
      industry: record.industry,
      size: record.size,
      founded: record.founded,
      headquarters: record.headquarters,
      website: record.website,
      description: record.description,
      status: record.status,
      legalForm: record.legalForm,
      vatId: record.vatId,
      registrationNumber: record.registrationNumber,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Company) => {
    Modal.confirm({
      title: 'Delete Company',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setCompanies(prev => prev.filter(company => company.id !== record.id));
          message.success('Company deleted successfully');
        } catch (error) {
          console.error('Error deleting company:', error);
          message.error('Failed to delete company');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCompany) {
        // Update existing company
        setCompanies(prev => 
          prev.map(company => 
            company.id === editingCompany.id 
              ? { ...company, ...values }
              : company
          )
        );
        message.success('Company updated successfully');
      } else {
        // Create new company
        const newCompany: Company = {
          id: Date.now().toString(),
          ...values
        };
        setCompanies(prev => [...prev, newCompany]);
        message.success('Company created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving company:', error);
      message.error('Failed to save company');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: Company, b: Company) => a.code.localeCompare(b.code),
    },
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Company, b: Company) => a.name.localeCompare(b.name),
      render: (name: string, record: Company) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BankOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold' }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Legal Name',
      dataIndex: 'legalName',
      key: 'legalName',
      ellipsis: true,
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      sorter: (a: Company, b: Company) => a.industry.localeCompare(b.industry),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 100,
    },
    {
      title: 'Headquarters',
      dataIndex: 'headquarters',
      key: 'headquarters',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Company) => (
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
      data-testid={`${prefixDataTestId || ''}-CompaniesTab`}
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
            {t('hr.companies_management', 'Companies Management')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-CompaniesTab-AddButton`}
          >
            Add Company
          </Button>
        </div>
        
        <Input
          placeholder="Search companies..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-CompaniesTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredCompanies}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} companies`,
        }}
        data-testid={`${prefixDataTestId || ''}-CompaniesTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
      />

      <Modal
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        data-testid={`${prefixDataTestId || ''}-CompaniesTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-CompaniesTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Company Name"
              name="name"
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <Input placeholder="Enter company name" />
            </Form.Item>
            
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Please enter company code' }]}
            >
              <Input placeholder="Enter company code" />
            </Form.Item>
          </div>

          <Form.Item
            label="Legal Name"
            name="legalName"
            rules={[{ required: true, message: 'Please enter legal name' }]}
          >
            <Input placeholder="Enter legal company name" />
          </Form.Item>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Industry"
              name="industry"
              rules={[{ required: true, message: 'Please select industry' }]}
            >
              <Select placeholder="Select industry">
                <Option value="Technology">Technology</Option>
                <Option value="Finance">Finance</Option>
                <Option value="Healthcare">Healthcare</Option>
                <Option value="Manufacturing">Manufacturing</Option>
                <Option value="Retail">Retail</Option>
                <Option value="Consulting">Consulting</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Company Size"
              name="size"
              rules={[{ required: true, message: 'Please select company size' }]}
            >
              <Select placeholder="Select company size">
                <Option value="1-10">1-10 employees</Option>
                <Option value="10-50">10-50 employees</Option>
                <Option value="50-100">50-100 employees</Option>
                <Option value="100-500">100-500 employees</Option>
                <Option value="500-1000">500-1000 employees</Option>
                <Option value="1000-5000">1000-5000 employees</Option>
                <Option value="5000+">5000+ employees</Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Founded"
              name="founded"
            >
              <Input placeholder="e.g., 2006" />
            </Form.Item>
            
            <Form.Item
              label="Legal Form"
              name="legalForm"
            >
              <Select placeholder="Select legal form">
                <Option value="GmbH">GmbH</Option>
                <Option value="AG">AG</Option>
                <Option value="SE">SE (Societas Europaea)</Option>
                <Option value="KG">KG</Option>
                <Option value="OHG">OHG</Option>
                <Option value="LLC">LLC</Option>
                <Option value="Corp">Corporation</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Headquarters"
            name="headquarters"
          >
            <Input placeholder="e.g., Hamburg, Germany" />
          </Form.Item>

          <Form.Item
            label="Website"
            name="website"
          >
            <Input placeholder="https://www.example.com" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="VAT ID"
              name="vatId"
            >
              <Input placeholder="e.g., DE123456789" />
            </Form.Item>
            
            <Form.Item
              label="Registration Number"
              name="registrationNumber"
            >
              <Input placeholder="e.g., HRB 123456" />
            </Form.Item>
          </div>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter company description (optional)" 
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { CompaniesTab }; 