import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ApartmentOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;
const { Option } = Select;

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head: string;
  parentDepartment?: string;
  location: string;
  employeeCount: number;
  budget: number;
  currency: string;
  status: 'Active' | 'Inactive';
  establishedDate: string;
}

export interface DepartmentsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockDepartments: Department[] = [
  {
    id: '1',
    name: 'Engineering',
    code: 'ENG',
    description: 'Software engineering and development',
    head: 'John Smith',
    location: 'Hamburg',
    employeeCount: 85,
    budget: 2500000,
    currency: 'EUR',
    status: 'Active',
    establishedDate: '2006-01-01'
  },
  {
    id: '2',
    name: 'Product Management',
    code: 'PM',
    description: 'Product strategy and management',
    head: 'Jane Doe',
    parentDepartment: 'Engineering',
    location: 'Hamburg',
    employeeCount: 12,
    budget: 800000,
    currency: 'EUR',
    status: 'Active',
    establishedDate: '2010-03-15'
  },
  {
    id: '3',
    name: 'Marketing',
    code: 'MKT',
    description: 'Marketing and brand management',
    head: 'Mike Johnson',
    location: 'Berlin',
    employeeCount: 25,
    budget: 1200000,
    currency: 'EUR',
    status: 'Active',
    establishedDate: '2008-06-01'
  },
  {
    id: '4',
    name: 'Human Resources',
    code: 'HR',
    description: 'HR operations and talent management',
    head: 'Sarah Wilson',
    location: 'Vienna',
    employeeCount: 15,
    budget: 600000,
    currency: 'EUR',
    status: 'Active',
    establishedDate: '2007-09-01'
  },
  {
    id: '5',
    name: 'Sales',
    code: 'SALES',
    description: 'Sales operations',
    head: 'David Brown',
    location: 'Munich',
    employeeCount: 35,
    budget: 1500000,
    currency: 'EUR',
    status: 'Inactive',
    establishedDate: '2009-11-15'
  }
];

const DepartmentsTab: React.FC<DepartmentsTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const filteredDepartments = departments.filter(department => 
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.head.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Department) => {
    setEditingDepartment(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      head: record.head,
      parentDepartment: record.parentDepartment,
      location: record.location,
      employeeCount: record.employeeCount,
      budget: record.budget,
      currency: record.currency,
      status: record.status,
      establishedDate: record.establishedDate,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Department) => {
    Modal.confirm({
      title: 'Delete Department',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setDepartments(prev => prev.filter(department => department.id !== record.id));
          message.success('Department deleted successfully');
        } catch (error) {
          console.error('Error deleting department:', error);
          message.error('Failed to delete department');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingDepartment) {
        // Update existing department
        setDepartments(prev => 
          prev.map(department => 
            department.id === editingDepartment.id 
              ? { ...department, ...values }
              : department
          )
        );
        message.success('Department updated successfully');
      } else {
        // Create new department
        const newDepartment: Department = {
          id: Date.now().toString(),
          ...values
        };
        setDepartments(prev => [...prev, newDepartment]);
        message.success('Department created successfully');
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
      sorter: (a: Department, b: Department) => a.name.localeCompare(b.name),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      sorter: (a: Department, b: Department) => a.code.localeCompare(b.code),
    },
    {
      title: 'Head',
      dataIndex: 'head',
      key: 'head',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      filters: [
        { text: 'Hamburg', value: 'Hamburg' },
        { text: 'Berlin', value: 'Berlin' },
        { text: 'Vienna', value: 'Vienna' },
        { text: 'Munich', value: 'Munich' },
      ],
      onFilter: (value: any, record: Department) => record.location === value,
    },
    {
      title: 'Employees',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
      sorter: (a: Department, b: Department) => a.employeeCount - b.employeeCount,
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number, record: Department) => 
        `${budget.toLocaleString()} ${record.currency}`,
      sorter: (a: Department, b: Department) => a.budget - b.budget,
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
      onFilter: (value: any, record: Department) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Department) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            data-testid={`${prefixDataTestId}-edit-department-${record.id}`}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            data-testid={`${prefixDataTestId}-delete-department-${record.id}`}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div data-testid={`${prefixDataTestId}-DepartmentsTab`}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ApartmentOutlined />
          {t('hr.departments', 'Departments')}
        </Title>
        <Space>
          <Input
            placeholder="Search departments..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 250 }}
            data-testid={`${prefixDataTestId}-search-departments`}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId}-add-department`}
          >
            Add Department
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredDepartments}
        rowKey="id"
        pagination={{
          total: filteredDepartments.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} departments`,
        }}
        data-testid={`${prefixDataTestId}-departments-table`}
      />

      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add New Department'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId}-department-modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId}-department-form`}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input the department name!' }]}
          >
            <Input placeholder="Enter department name" />
          </Form.Item>

          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please input the department code!' }]}
          >
            <Input placeholder="Enter department code" />
          </Form.Item>

          <Form.Item
            label="Head of Department"
            name="head"
            rules={[{ required: true, message: 'Please input the department head!' }]}
          >
            <Input placeholder="Enter department head name" />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
            rules={[{ required: true, message: 'Please select the location!' }]}
          >
            <Select placeholder="Select location">
              <Option value="Hamburg">Hamburg</Option>
              <Option value="Berlin">Berlin</Option>
              <Option value="Vienna">Vienna</Option>
              <Option value="Munich">Munich</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Employee Count"
            name="employeeCount"
            rules={[{ required: true, message: 'Please input the employee count!' }]}
          >
            <Input type="number" placeholder="Enter employee count" />
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
            label="Established Date"
            name="establishedDate"
            rules={[{ required: true, message: 'Please input the established date!' }]}
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
            label="Parent Department"
            name="parentDepartment"
          >
            <Input placeholder="Enter parent department (optional)" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              placeholder="Enter department description"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentsTab;
export { DepartmentsTab }; 