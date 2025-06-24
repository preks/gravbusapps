import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag, Spin, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TrophyOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCapabilities } from '../../hooks/useCapabilities';

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

const CapabilitiesTab: React.FC<CapabilitiesTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const {
    capabilities,
    isLoading,
    error,
    refetch,
    totalCapabilities,
    activeCapabilities
  } = useCapabilities(context);
  
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
        message.warning('Delete functionality will be implemented with process API integration');
        await refetch();
      },
    });
  };

  const handleModalOk = async () => {
    try {
      await form.validateFields();
      
      if (editingCapability) {
        // Update existing capability
        message.warning('Update capability functionality will be implemented with process API integration');
      } else {
        // Create new capability
        message.warning('Create capability functionality will be implemented with process API integration');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      await refetch();
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
            data-testid={`${prefixDataTestId || ''}-edit-capability-${record.id}`}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            data-testid={`${prefixDataTestId || ''}-delete-capability-${record.id}`}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Capabilities"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={refetch}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div data-testid={`${prefixDataTestId || ''}-CapabilitiesTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={4} style={{ margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrophyOutlined />
            {t('hr.capabilities', 'Capabilities')}
          </Title>
          <Tag color="blue">{totalCapabilities} capabilities</Tag>
          <Tag color="green">{activeCapabilities} active</Tag>
        </div>
        <Space>
          <Input
            placeholder={t('hr.search_capabilities', 'Search capabilities...')}
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 250 }}
            allowClear
            data-testid={`${prefixDataTestId || ''}-search-capabilities`}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-add-capability`}
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
        data-testid={`${prefixDataTestId || ''}-capabilities-table`}
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
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