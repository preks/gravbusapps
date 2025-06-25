import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;

export interface JobFunction {
  id: string;
  name: string;
  code: string;
  description?: string;
  level: number;
  category: string;
}

export interface JobFunctionsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockJobFunctions: JobFunction[] = [
  {
    id: '1',
    name: 'Software Engineering',
    code: 'SE',
    description: 'Design, develop, and maintain software applications',
    level: 3,
    category: 'Technology'
  },
  {
    id: '2',
    name: 'Product Management',
    code: 'PM',
    description: 'Define product strategy and manage product lifecycle',
    level: 4,
    category: 'Product'
  },
  {
    id: '3',
    name: 'Human Resources',
    code: 'HR',
    description: 'Manage employee relations and organizational development',
    level: 3,
    category: 'Operations'
  },
  {
    id: '4',
    name: 'Sales',
    code: 'SA',
    description: 'Drive revenue through customer acquisition and retention',
    level: 2,
    category: 'Business'
  },
  {
    id: '5',
    name: 'Marketing',
    code: 'MK',
    description: 'Develop and execute marketing strategies',
    level: 3,
    category: 'Business'
  }
];

const JobFunctionsTab: React.FC<JobFunctionsTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>(mockJobFunctions);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFunction, setEditingFunction] = useState<JobFunction | null>(null);
  const [form] = Form.useForm();

  const filteredFunctions = jobFunctions.filter(func => 
    func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    func.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    func.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    func.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingFunction(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: JobFunction) => {
    setEditingFunction(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      level: record.level,
      category: record.category,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: JobFunction) => {
    Modal.confirm({
      title: 'Delete Job Function',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setJobFunctions(prev => prev.filter(func => func.id !== record.id));
          message.success('Job function deleted successfully');
        } catch (error) {
          console.error('Error deleting job function:', error);
          message.error('Failed to delete job function');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingFunction) {
        // Update existing function
        setJobFunctions(prev => 
          prev.map(func => 
            func.id === editingFunction.id 
              ? { ...func, ...values }
              : func
          )
        );
        message.success('Job function updated successfully');
      } else {
        // Create new function
        const newFunction: JobFunction = {
          id: Date.now().toString(),
          ...values
        };
        setJobFunctions(prev => [...prev, newFunction]);
        message.success('Job function created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving job function:', error);
      message.error('Failed to save job function');
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
      sorter: (a: JobFunction, b: JobFunction) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobFunction, b: JobFunction) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: (a: JobFunction, b: JobFunction) => a.category.localeCompare(b.category),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      sorter: (a: JobFunction, b: JobFunction) => a.level - b.level,
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
      render: (_: any, record: JobFunction) => (
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
            {t('hr.job_functions', 'Job Functions')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-AddButton`}
          >
            Add Job Function
          </Button>
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

      {loading ? (
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
        title={editingFunction ? 'Edit Job Function' : 'Add Job Function'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Enter job function name" />
            </Form.Item>
            
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter job function code" />
            </Form.Item>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Category"
              name="category"
              rules={[{ required: true, message: 'Please enter a category' }]}
            >
              <Input placeholder="Enter category" />
            </Form.Item>
            
            <Form.Item
              label="Level"
              name="level"
              rules={[{ required: true, message: 'Please enter a level' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter level (1-5)" 
                min={1}
                max={5}
              />
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

export { JobFunctionsTab }; 