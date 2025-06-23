import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;
const { Option } = Select;

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  description?: string;
  department: string;
  manager: string;
  budget: number;
  currency: string;
  status: 'Active' | 'Inactive';
  validFrom: string;
  validTo?: string;
  parentCostCenter?: string;
}

export interface CostCentersTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockCostCenters: CostCenter[] = [
  {
    id: '1',
    name: 'Engineering',
    code: 'ENG001',
    description: 'Software engineering and development',
    department: 'Technology',
    manager: 'John Smith',
    budget: 500000,
    currency: 'EUR',
    status: 'Active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '2',
    name: 'Marketing',
    code: 'MKT001',
    description: 'Marketing and brand management',
    department: 'Marketing',
    manager: 'Jane Doe',
    budget: 250000,
    currency: 'EUR',
    status: 'Active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '3',
    name: 'Human Resources',
    code: 'HR001',
    description: 'HR operations and talent management',
    department: 'Human Resources',
    manager: 'Mike Johnson',
    budget: 150000,
    currency: 'EUR',
    status: 'Active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '4',
    name: 'Sales Europe',
    code: 'SAL001',
    description: 'European sales operations',
    department: 'Sales',
    manager: 'Sarah Wilson',
    budget: 300000,
    currency: 'EUR',
    status: 'Active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '5',
    name: 'Research & Development',
    code: 'RND001',
    description: 'Product research and development',
    department: 'Technology',
    manager: 'David Brown',
    budget: 400000,
    currency: 'EUR',
    status: 'Inactive',
    validFrom: '2023-01-01',
    validTo: '2023-12-31'
  }
];

const CostCentersTab: React.FC<CostCentersTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [costCenters, setCostCenters] = useState<CostCenter[]>(mockCostCenters);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [form] = Form.useForm();

  const filteredCostCenters = costCenters.filter(costCenter => 
    costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    costCenter.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    costCenter.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingCostCenter(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: CostCenter) => {
    setEditingCostCenter(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      department: record.department,
      manager: record.manager,
      budget: record.budget,
      currency: record.currency,
      status: record.status,
      validFrom: record.validFrom,
      validTo: record.validTo,
      parentCostCenter: record.parentCostCenter,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: CostCenter) => {
    Modal.confirm({
      title: 'Delete Cost Center',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setCostCenters(prev => prev.filter(costCenter => costCenter.id !== record.id));
          message.success('Cost center deleted successfully');
        } catch (error) {
          console.error('Error deleting cost center:', error);
          message.error('Failed to delete cost center');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCostCenter) {
        // Update existing cost center
        setCostCenters(prev => 
          prev.map(costCenter => 
            costCenter.id === editingCostCenter.id 
              ? { ...costCenter, ...values }
              : costCenter
          )
        );
        message.success('Cost center updated successfully');
      } else {
        // Create new cost center
        const newCostCenter: CostCenter = {
          id: Date.now().toString(),
          ...values
        };
        setCostCenters(prev => [...prev, newCostCenter]);
        message.success('Cost center created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: CostCenter, b: CostCenter) => a.name.localeCompare(b.name),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      sorter: (a: CostCenter, b: CostCenter) => a.code.localeCompare(b.code),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      filters: [
        { text: 'Technology', value: 'Technology' },
        { text: 'Marketing', value: 'Marketing' },
        { text: 'Human Resources', value: 'Human Resources' },
        { text: 'Sales', value: 'Sales' },
      ],
      onFilter: (value: any, record: CostCenter) => record.department === value,
    },
    {
      title: 'Manager',
      dataIndex: 'manager',
      key: 'manager',
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number, record: CostCenter) => 
        `${budget.toLocaleString()} ${record.currency}`,
      sorter: (a: CostCenter, b: CostCenter) => a.budget - b.budget,
    },
    {
      title: 'Valid Period',
      key: 'validPeriod',
      render: (_: any, record: CostCenter) => 
        `${record.validFrom} - ${record.validTo || 'Ongoing'}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value: any, record: CostCenter) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CostCenter) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            data-testid={`${prefixDataTestId}-edit-cost-center-${record.id}`}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            data-testid={`${prefixDataTestId}-delete-cost-center-${record.id}`}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div data-testid={`${prefixDataTestId}-CostCentersTab`}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarOutlined />
          {t('hr.cost_centers', 'Cost Centers')}
        </Title>
        <Space>
          <Input
            placeholder="Search cost centers..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 250 }}
            data-testid={`${prefixDataTestId}-search-cost-centers`}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId}-add-cost-center`}
          >
            Add Cost Center
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredCostCenters}
        rowKey="id"
        pagination={{
          total: filteredCostCenters.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cost centers`,
        }}
        data-testid={`${prefixDataTestId}-cost-centers-table`}
      />

      <Modal
        title={editingCostCenter ? 'Edit Cost Center' : 'Add New Cost Center'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId}-cost-center-modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId}-cost-center-form`}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input the cost center name!' }]}
          >
            <Input placeholder="Enter cost center name" />
          </Form.Item>

          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please input the cost center code!' }]}
          >
            <Input placeholder="Enter cost center code" />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department"
            rules={[{ required: true, message: 'Please select the department!' }]}
          >
            <Select placeholder="Select department">
              <Option value="Technology">Technology</Option>
              <Option value="Marketing">Marketing</Option>
              <Option value="Human Resources">Human Resources</Option>
              <Option value="Sales">Sales</Option>
              <Option value="Finance">Finance</Option>
              <Option value="Operations">Operations</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Manager"
            name="manager"
            rules={[{ required: true, message: 'Please input the manager name!' }]}
          >
            <Input placeholder="Enter manager name" />
          </Form.Item>

          <Form.Item
            label="Budget"
            name="budget"
            rules={[{ required: true, message: 'Please input the budget!' }]}
          >
            <Input type="number" placeholder="Enter budget amount" />
          </Form.Item>

          <Form.Item
            label="Currency"
            name="currency"
            initialValue="EUR"
            rules={[{ required: true, message: 'Please select the currency!' }]}
          >
            <Select placeholder="Select currency">
              <Option value="EUR">EUR</Option>
              <Option value="USD">USD</Option>
              <Option value="GBP">GBP</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Valid From"
            name="validFrom"
            rules={[{ required: true, message: 'Please input the valid from date!' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            label="Valid To"
            name="validTo"
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select the status!' }]}
          >
            <Select placeholder="Select status">
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Parent Cost Center"
            name="parentCostCenter"
          >
            <Input placeholder="Enter parent cost center (optional)" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              placeholder="Enter cost center description"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CostCentersTab;
export { CostCentersTab }; 