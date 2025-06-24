import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TrophyOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;
const { Option } = Select;

export interface Capability {
  id: string;
  name: string;
  code: string;
  category: string;
  level: string;
  description?: string;
  status: 'Active' | 'Inactive';
  competencyArea: string;
  requiredLevel: string;
  certificationRequired: boolean;
}

export interface CapabilitiesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockCapabilities: Capability[] = [
  {
    id: '1',
    name: 'Software Development',
    code: 'SD001',
    category: 'Technical',
    level: 'Expert',
    description: 'Full-stack software development capabilities',
    status: 'Active',
    competencyArea: 'Engineering',
    requiredLevel: 'Senior',
    certificationRequired: false
  },
  {
    id: '2',
    name: 'Project Management',
    code: 'PM001',
    category: 'Leadership',
    level: 'Advanced',
    description: 'Project planning, execution, and delivery',
    status: 'Active',
    competencyArea: 'Management',
    requiredLevel: 'Intermediate',
    certificationRequired: true
  },
  {
    id: '3',
    name: 'Data Analysis',
    code: 'DA001',
    category: 'Analytical',
    level: 'Advanced',
    description: 'Statistical analysis and data interpretation',
    status: 'Active',
    competencyArea: 'Analytics',
    requiredLevel: 'Intermediate',
    certificationRequired: false
  },
  {
    id: '4',
    name: 'UI/UX Design',
    code: 'UX001',
    category: 'Creative',
    level: 'Expert',
    description: 'User interface and experience design',
    status: 'Active',
    competencyArea: 'Design',
    requiredLevel: 'Senior',
    certificationRequired: false
  },
  {
    id: '5',
    name: 'DevOps',
    code: 'DO001',
    category: 'Technical',
    level: 'Advanced',
    description: 'Development operations and automation',
    status: 'Inactive',
    competencyArea: 'Engineering',
    requiredLevel: 'Senior',
    certificationRequired: true
  }
];

const CapabilitiesTab: React.FC<CapabilitiesTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [capabilities, setCapabilities] = useState<Capability[]>(mockCapabilities);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCapability, setEditingCapability] = useState<Capability | null>(null);
  const [form] = Form.useForm();

  const filteredCapabilities = capabilities.filter(capability => 
    capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capability.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capability.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capability.competencyArea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingCapability(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Capability) => {
    setEditingCapability(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      category: record.category,
      level: record.level,
      description: record.description,
      status: record.status,
      competencyArea: record.competencyArea,
      requiredLevel: record.requiredLevel,
      certificationRequired: record.certificationRequired,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Capability) => {
    Modal.confirm({
      title: 'Delete Capability',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setCapabilities(prev => prev.filter(capability => capability.id !== record.id));
          message.success('Capability deleted successfully');
        } catch (error) {
          console.error('Error deleting capability:', error);
          message.error('Failed to delete capability');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCapability) {
        // Update existing capability
        setCapabilities(prev => 
          prev.map(capability => 
            capability.id === editingCapability.id 
              ? { ...capability, ...values }
              : capability
          )
        );
        message.success('Capability updated successfully');
      } else {
        // Create new capability
        const newCapability: Capability = {
          id: Date.now().toString(),
          ...values
        };
        setCapabilities(prev => [...prev, newCapability]);
        message.success('Capability created successfully');
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
      sorter: (a: Capability, b: Capability) => a.name.localeCompare(b.name),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      sorter: (a: Capability, b: Capability) => a.code.localeCompare(b.code),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      filters: [
        { text: 'Technical', value: 'Technical' },
        { text: 'Leadership', value: 'Leadership' },
        { text: 'Analytical', value: 'Analytical' },
        { text: 'Creative', value: 'Creative' },
      ],
      onFilter: (value: any, record: Capability) => record.category === value,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const color = level === 'Expert' ? 'gold' : level === 'Advanced' ? 'blue' : 'green';
        return <Tag color={color}>{level}</Tag>;
      },
    },
    {
      title: 'Competency Area',
      dataIndex: 'competencyArea',
      key: 'competencyArea',
    },
    {
      title: 'Certification Required',
      dataIndex: 'certificationRequired',
      key: 'certificationRequired',
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'green'}>
          {required ? 'Required' : 'Not Required'}
        </Tag>
      ),
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
      onFilter: (value: any, record: Capability) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Capability) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            data-testid={`${prefixDataTestId}-edit-capability-${record.id}`}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            data-testid={`${prefixDataTestId}-delete-capability-${record.id}`}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div data-testid={`${prefixDataTestId}-CapabilitiesTab`}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrophyOutlined />
          {t('hr.capabilities', 'Capabilities')}
        </Title>
        <Space>
          <Input
            placeholder="Search capabilities..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 250 }}
            data-testid={`${prefixDataTestId}-search-capabilities`}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId}-add-capability`}
          >
            Add Capability
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredCapabilities}
        rowKey="id"
        pagination={{
          total: filteredCapabilities.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} capabilities`,
        }}
        data-testid={`${prefixDataTestId}-capabilities-table`}
      />

      <Modal
        title={editingCapability ? 'Edit Capability' : 'Add New Capability'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId}-capability-modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId}-capability-form`}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input the capability name!' }]}
          >
            <Input placeholder="Enter capability name" />
          </Form.Item>

          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please input the capability code!' }]}
          >
            <Input placeholder="Enter capability code" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select the category!' }]}
          >
            <Select placeholder="Select category">
              <Option value="Technical">Technical</Option>
              <Option value="Leadership">Leadership</Option>
              <Option value="Analytical">Analytical</Option>
              <Option value="Creative">Creative</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Level"
            name="level"
            rules={[{ required: true, message: 'Please select the level!' }]}
          >
            <Select placeholder="Select level">
              <Option value="Beginner">Beginner</Option>
              <Option value="Intermediate">Intermediate</Option>
              <Option value="Advanced">Advanced</Option>
              <Option value="Expert">Expert</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Competency Area"
            name="competencyArea"
            rules={[{ required: true, message: 'Please input the competency area!' }]}
          >
            <Input placeholder="Enter competency area" />
          </Form.Item>

          <Form.Item
            label="Required Level"
            name="requiredLevel"
            rules={[{ required: true, message: 'Please select the required level!' }]}
          >
            <Select placeholder="Select required level">
              <Option value="Junior">Junior</Option>
              <Option value="Intermediate">Intermediate</Option>
              <Option value="Senior">Senior</Option>
              <Option value="Expert">Expert</Option>
            </Select>
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
            label="Certification Required"
            name="certificationRequired"
            valuePropName="checked"
          >
            <Select placeholder="Select certification requirement">
              <Option value={true}>Required</Option>
              <Option value={false}>Not Required</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              placeholder="Enter capability description"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CapabilitiesTab;
export { CapabilitiesTab }; 