import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;

export interface JobProfile {
  id: string;
  name: string;
  code: string;
  function: string;
  level: string;
  description?: string;
  skills: string[];
  status: 'Active' | 'Inactive' | 'Draft';
}

export interface JobProfilesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockJobProfiles: JobProfile[] = [
  {
    id: '1',
    name: 'Senior Software Engineer',
    code: 'SSE',
    function: 'Software Engineering',
    level: 'Senior',
    description: 'Senior software engineer responsible for complex development tasks',
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    status: 'Active'
  },
  {
    id: '2',
    name: 'Product Manager',
    code: 'PM',
    function: 'Product Management',
    level: 'Mid-Level',
    description: 'Product manager responsible for product strategy and roadmap',
    skills: ['Product Strategy', 'Analytics', 'Agile', 'User Research'],
    status: 'Active'
  },
  {
    id: '3',
    name: 'HR Business Partner',
    code: 'HRBP',
    function: 'Human Resources',
    level: 'Senior',
    description: 'HR business partner supporting organizational development',
    skills: ['Employee Relations', 'Coaching', 'Change Management', 'Analytics'],
    status: 'Active'
  },
  {
    id: '4',
    name: 'Sales Representative',
    code: 'SR',
    function: 'Sales',
    level: 'Junior',
    description: 'Sales representative for customer acquisition',
    skills: ['Sales', 'CRM', 'Communication', 'Negotiation'],
    status: 'Active'
  },
  {
    id: '5',
    name: 'Marketing Specialist',
    code: 'MS',
    function: 'Marketing',
    level: 'Mid-Level',
    description: 'Marketing specialist for campaign development',
    skills: ['Digital Marketing', 'SEO', 'Content Creation', 'Analytics'],
    status: 'Draft'
  }
];

const jobFunctions = [
  'Software Engineering',
  'Product Management', 
  'Human Resources',
  'Sales',
  'Marketing',
  'Finance',
  'Operations'
];

const jobLevels = [
  'Junior',
  'Mid-Level',
  'Senior',
  'Lead',
  'Principal'
];

const statusOptions = [
  { value: 'Active', label: 'Active', color: 'green' },
  { value: 'Inactive', label: 'Inactive', color: 'red' },
  { value: 'Draft', label: 'Draft', color: 'orange' }
];

const JobProfilesTab: React.FC<JobProfilesTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>(mockJobProfiles);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<JobProfile | null>(null);
  const [form] = Form.useForm();

  const filteredProfiles = jobProfiles.filter(profile => 
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.function.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingProfile(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: JobProfile) => {
    setEditingProfile(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (record: JobProfile) => {
    Modal.confirm({
      title: 'Delete Job Profile',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setJobProfiles(prev => prev.filter(profile => profile.id !== record.id));
          message.success('Job profile deleted successfully');
        } catch (error) {
          console.error('Error deleting job profile:', error);
          message.error('Failed to delete job profile');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingProfile) {
        setJobProfiles(prev => 
          prev.map(profile => 
            profile.id === editingProfile.id 
              ? { ...profile, ...values }
              : profile
          )
        );
        message.success('Job profile updated successfully');
      } else {
        const newProfile: JobProfile = {
          id: Date.now().toString(),
          ...values
        };
        setJobProfiles(prev => [...prev, newProfile]);
        message.success('Job profile created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving job profile:', error);
      message.error('Failed to save job profile');
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
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Function',
      dataIndex: 'function',
      key: 'function',
      width: 150,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 120,
    },
    {
      title: 'Skills',
      dataIndex: 'skills',
      key: 'skills',
      width: 200,
      render: (skills: string[]) => (
        <div>
          {skills.slice(0, 2).map(skill => (
            <Tag key={skill} style={{ marginBottom: '2px', fontSize: '12px' }}>
              {skill}
            </Tag>
          ))}
          {skills.length > 2 && (
            <Tag color="blue" style={{ fontSize: '12px' }}>
              +{skills.length - 2} more
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = statusOptions.find(opt => opt.value === status);
        return (
          <Tag color={statusConfig?.color}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: JobProfile) => (
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
      data-testid={`${prefixDataTestId || ''}-JobProfilesTab`}
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
            {t('hr.job_profiles', 'Job Profiles')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add Job Profile
          </Button>
        </div>
        
        <Input
          placeholder="Search job profiles..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredProfiles}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} job profiles`,
        }}
        style={{ background: 'white', borderRadius: '8px' }}
      />

      <Modal
        title={editingProfile ? 'Edit Job Profile' : 'Add Job Profile'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={700}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Enter job profile name" />
            </Form.Item>
            
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter job profile code" />
            </Form.Item>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Function"
              name="function"
              rules={[{ required: true, message: 'Please select a function' }]}
            >
              <Select placeholder="Select job function">
                {jobFunctions.map(func => (
                  <Select.Option key={func} value={func}>
                    {func}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Level"
              name="level"
              rules={[{ required: true, message: 'Please select a level' }]}
            >
              <Select placeholder="Select job level">
                {jobLevels.map(level => (
                  <Select.Option key={level} value={level}>
                    {level}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Please select a status' }]}
            >
              <Select placeholder="Select status">
                {statusOptions.map(status => (
                  <Select.Option key={status.value} value={status.value}>
                    {status.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item
            label="Skills"
            name="skills"
            rules={[{ required: true, message: 'Please enter skills' }]}
          >
            <Select
              mode="tags"
              placeholder="Enter skills (press Enter to add)"
              style={{ width: '100%' }}
            />
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
        </Form>
      </Modal>
    </div>
  );
};

export { JobProfilesTab }; 