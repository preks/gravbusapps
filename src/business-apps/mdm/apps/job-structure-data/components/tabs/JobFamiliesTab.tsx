import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;

export interface JobFamily {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  isActive: boolean;
}

export interface JobFamiliesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockJobFamilies: JobFamily[] = [
  {
    id: '1',
    name: 'Engineering',
    code: 'ENG',
    description: 'Software development and technical roles',
    category: 'Technology',
    isActive: true
  },
  {
    id: '2',
    name: 'Product',
    code: 'PROD',
    description: 'Product management and strategy roles',
    category: 'Business',
    isActive: true
  },
  {
    id: '3',
    name: 'Design',
    code: 'DES',
    description: 'User experience and visual design roles',
    category: 'Creative',
    isActive: true
  },
  {
    id: '4',
    name: 'Sales',
    code: 'SALES',
    description: 'Revenue generation and customer acquisition',
    category: 'Business',
    isActive: true
  },
  {
    id: '5',
    name: 'Marketing',
    code: 'MKT',
    description: 'Brand management and customer engagement',
    category: 'Business',
    isActive: true
  },
  {
    id: '6',
    name: 'Operations',
    code: 'OPS',
    description: 'Business operations and process management',
    category: 'Operations',
    isActive: true
  },
  {
    id: '7',
    name: 'Finance',
    code: 'FIN',
    description: 'Financial planning and analysis',
    category: 'Finance',
    isActive: true
  },
  {
    id: '8',
    name: 'Human Resources',
    code: 'HR',
    description: 'People operations and talent management',
    category: 'Operations',
    isActive: true
  }
];

const JobFamiliesTab: React.FC<JobFamiliesTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>(mockJobFamilies);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFamily, setEditingFamily] = useState<JobFamily | null>(null);
  const [form] = Form.useForm();

  const filteredFamilies = jobFamilies.filter(family => 
    family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingFamily(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: JobFamily) => {
    setEditingFamily(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      category: record.category,
      isActive: record.isActive,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: JobFamily) => {
    Modal.confirm({
      title: 'Delete Job Family',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setJobFamilies(prev => prev.filter(family => family.id !== record.id));
          message.success('Job family deleted successfully');
        } catch (error) {
          console.error('Error deleting job family:', error);
          message.error('Failed to delete job family');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingFamily) {
        // Update existing family
        setJobFamilies(prev => 
          prev.map(family => 
            family.id === editingFamily.id 
              ? { ...family, ...values }
              : family
          )
        );
        message.success('Job family updated successfully');
      } else {
        // Create new family
        const newFamily: JobFamily = {
          id: Date.now().toString(),
          ...values
        };
        setJobFamilies(prev => [...prev, newFamily]);
        message.success('Job family created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving job family:', error);
      message.error('Failed to save job family');
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
      sorter: (a: JobFamily, b: JobFamily) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobFamily, b: JobFamily) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: (a: JobFamily, b: JobFamily) => a.category.localeCompare(b.category),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <span style={{ 
          color: isActive ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: JobFamily) => (
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
      data-testid={`${prefixDataTestId || ''}-JobFamiliesTab`}
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
            {t('hr.job_families', 'Job Families')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-JobFamiliesTab-AddButton`}
          >
            Add Job Family
          </Button>
        </div>
        
        <Input
          placeholder="Search job families..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-JobFamiliesTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredFamilies}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} job families`,
        }}
        data-testid={`${prefixDataTestId || ''}-JobFamiliesTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
      />

      <Modal
        title={editingFamily ? 'Edit Job Family' : 'Add Job Family'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-JobFamiliesTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-JobFamiliesTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Enter job family name" />
            </Form.Item>
            
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter job family code" />
            </Form.Item>
          </div>
          
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please enter a category' }]}
          >
            <Input placeholder="Enter category" />
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter description (optional)" 
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            label="Status"
            name="isActive"
            valuePropName="checked"
          >
            <input type="checkbox" />
            <span style={{ marginLeft: '8px' }}>Active</span>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { JobFamiliesTab }; 