import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;

export interface JobLevel {
  id: string;
  name: string;
  code: string;
  level: number;
  description?: string;
  salaryGrade: number;
  experienceYears: number;
}

export interface JobLevelGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  isActive: boolean;
  jobLevels: JobLevel[];
  expanded?: boolean;
}

export interface JobLevelsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockJobLevelGroups: JobLevelGroup[] = [
  {
    id: '1',
    name: 'Individual Contributor',
    code: 'IC',
    description: 'Individual contributor career progression',
    category: 'Technical',
    isActive: true,
    expanded: false,
    jobLevels: [
      {
        id: 'ic1',
        name: 'IC1 - Junior',
        code: 'IC1',
        level: 1,
        description: 'Entry level individual contributor',
        salaryGrade: 1,
        experienceYears: 0
      },
      {
        id: 'ic2',
        name: 'IC2 - Mid-Level',
        code: 'IC2',
        level: 2,
        description: 'Mid-level individual contributor',
        salaryGrade: 2,
        experienceYears: 2
      },
      {
        id: 'ic3',
        name: 'IC3 - Senior',
        code: 'IC3',
        level: 3,
        description: 'Senior individual contributor',
        salaryGrade: 3,
        experienceYears: 5
      }
    ]
  },
  {
    id: '2',
    name: 'Management Track',
    code: 'MGT',
    description: 'Management career progression',
    category: 'Leadership',
    isActive: true,
    expanded: false,
    jobLevels: [
      {
        id: 'mg1',
        name: 'M1 - Team Lead',
        code: 'M1',
        level: 4,
        description: 'Team leadership role',
        salaryGrade: 4,
        experienceYears: 6
      },
      {
        id: 'mg2',
        name: 'M2 - Manager',
        code: 'M2',
        level: 5,
        description: 'People manager role',
        salaryGrade: 5,
        experienceYears: 8
      },
      {
        id: 'mg3',
        name: 'M3 - Director',
        code: 'M3',
        level: 6,
        description: 'Director level management',
        salaryGrade: 6,
        experienceYears: 12
      }
    ]
  },
  {
    id: '3',
    name: 'Executive Track',
    code: 'EXEC',
    description: 'Executive leadership progression',
    category: 'Executive',
    isActive: true,
    expanded: false,
    jobLevels: [
      {
        id: 'ex1',
        name: 'VP - Vice President',
        code: 'VP',
        level: 7,
        description: 'Vice President level',
        salaryGrade: 7,
        experienceYears: 15
      },
      {
        id: 'ex2',
        name: 'SVP - Senior Vice President',
        code: 'SVP',
        level: 8,
        description: 'Senior Vice President level',
        salaryGrade: 8,
        experienceYears: 18
      }
    ]
  }
];

const JobLevelsTab: React.FC<JobLevelsTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [jobLevelGroups, setJobLevelGroups] = useState<JobLevelGroup[]>(mockJobLevelGroups);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<JobLevelGroup | null>(null);
  const [form] = Form.useForm();

  const filteredGroups = jobLevelGroups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExpand = (expanded: boolean, record: JobLevelGroup) => {
    setJobLevelGroups(prev => 
      prev.map(group => 
        group.id === record.id 
          ? { ...group, expanded }
          : group
      )
    );
  };

  const handleAdd = () => {
    setEditingGroup(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: JobLevelGroup) => {
    setEditingGroup(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      category: record.category,
      isActive: record.isActive,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: JobLevelGroup) => {
    Modal.confirm({
      title: 'Delete Job Level Group',
      content: `Are you sure you want to delete "${record.name}"? This will also delete all associated job levels.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setJobLevelGroups(prev => prev.filter(group => group.id !== record.id));
          message.success('Job level group deleted successfully');
        } catch (error) {
          console.error('Error deleting job level group:', error);
          message.error('Failed to delete job level group');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingGroup) {
        // Update existing group
        setJobLevelGroups(prev => 
          prev.map(group => 
            group.id === editingGroup.id 
              ? { ...group, ...values }
              : group
          )
        );
        message.success('Job level group updated successfully');
      } else {
        // Create new group
        const newGroup: JobLevelGroup = {
          id: Date.now().toString(),
          jobLevels: [],
          expanded: false,
          ...values
        };
        setJobLevelGroups(prev => [...prev, newGroup]);
        message.success('Job level group created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving job level group:', error);
      message.error('Failed to save job level group');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const expandedRowRender = (record: JobLevelGroup) => {
    const levelColumns = [
      {
        title: 'Level',
        dataIndex: 'level',
        key: 'level',
        width: 80,
      },
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
        title: 'Salary Grade',
        dataIndex: 'salaryGrade',
        key: 'salaryGrade',
        width: 120,
      },
      {
        title: 'Experience',
        dataIndex: 'experienceYears',
        key: 'experienceYears',
        width: 120,
        render: (years: number) => `${years} years`,
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
    ];

    return (
      <div style={{ margin: '16px 0', background: '#fafafa', padding: '16px', borderRadius: '6px' }}>
        <Title level={5} style={{ marginTop: 0, color: '#666' }}>
          Job Levels in {record.name}
        </Title>
        <Table
          columns={levelColumns}
          dataSource={record.jobLevels}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ background: 'white' }}
        />
      </div>
    );
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: JobLevelGroup, b: JobLevelGroup) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobLevelGroup, b: JobLevelGroup) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: (a: JobLevelGroup, b: JobLevelGroup) => a.category.localeCompare(b.category),
    },
    {
      title: 'Job Levels',
      key: 'jobLevelsCount',
      width: 120,
      render: (_: any, record: JobLevelGroup) => (
        <Tag color="blue">{record.jobLevels.length} levels</Tag>
      ),
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
      render: (_: any, record: JobLevelGroup) => (
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
      data-testid={`${prefixDataTestId || ''}-JobLevelsTab`}
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
            {t('hr.job_levels', 'Job Levels')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-JobLevelsTab-AddButton`}
          >
            Add Job Level Group
          </Button>
        </div>
        
        <Input
          placeholder="Search job levels..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-JobLevelsTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredGroups}
        rowKey="id"
        expandable={{
          expandedRowRender,
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              size="small"
              icon={expanded ? <DownOutlined /> : <RightOutlined />}
              onClick={(e) => onExpand(record, e)}
            />
          ),
          onExpand: handleExpand,
        }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
                      showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} job levels`,
        }}
        data-testid={`${prefixDataTestId || ''}-JobLevelsTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
      />

      <Modal
        title={editingGroup ? 'Edit Job Level Group' : 'Add Job Level Group'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-JobLevelsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-JobLevelsTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Enter job level group name" />
            </Form.Item>
            
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Please enter a code' }]}
            >
              <Input placeholder="Enter job level group code" />
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

export { JobLevelsTab }; 