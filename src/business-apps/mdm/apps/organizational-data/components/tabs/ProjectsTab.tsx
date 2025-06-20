import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ProjectOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'Active' | 'Planned' | 'Completed' | 'On Hold' | 'Cancelled';
  startDate?: string;
  endDate?: string;
  clientName?: string;
  projectManager: string;
  department: string;
  budget?: number;
  billable: boolean;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ProjectsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'XING Platform Redesign',
    code: 'XPR-2024',
    description: 'Complete redesign of the XING platform with modern UI/UX',
    status: 'Active',
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    clientName: 'Internal',
    projectManager: 'Sarah Johnson',
    department: 'Engineering',
    budget: 250000,
    billable: false,
    priority: 'High'
  },
  {
    id: '2',
    name: 'kununu Mobile App',
    code: 'KMA-2024',
    description: 'Development of native mobile application for kununu',
    status: 'Active',
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    clientName: 'Internal',
    projectManager: 'Michael Chen',
    department: 'Product',
    budget: 180000,
    billable: false,
    priority: 'High'
  },
  {
    id: '3',
    name: 'Client API Integration',
    code: 'CAI-2024',
    description: 'Integration of third-party APIs for enterprise clients',
    status: 'Planned',
    startDate: '2024-04-01',
    endDate: '2024-07-31',
    clientName: 'Enterprise Solutions AG',
    projectManager: 'Lisa Weber',
    department: 'Engineering',
    budget: 120000,
    billable: true,
    priority: 'Medium'
  },
  {
    id: '4',
    name: 'Data Analytics Platform',
    code: 'DAP-2024',
    description: 'Development of internal data analytics and reporting platform',
    status: 'Active',
    startDate: '2024-01-01',
    endDate: '2024-05-31',
    clientName: 'Internal',
    projectManager: 'Robert Schmidt',
    department: 'Data Science',
    budget: 200000,
    billable: false,
    priority: 'Medium'
  },
  {
    id: '5',
    name: 'Security Audit & Compliance',
    code: 'SAC-2023',
    description: 'Comprehensive security audit and GDPR compliance implementation',
    status: 'Completed',
    startDate: '2023-09-01',
    endDate: '2023-12-31',
    clientName: 'Internal',
    projectManager: 'Anna Müller',
    department: 'Security',
    budget: 80000,
    billable: false,
    priority: 'Critical'
  },
  {
    id: '6',
    name: 'Customer Portal Enhancement',
    code: 'CPE-2024',
    description: 'Enhancement of existing customer portal with new features',
    status: 'On Hold',
    startDate: '2024-03-01',
    endDate: '2024-09-30',
    clientName: 'Various Clients',
    projectManager: 'Thomas Bauer',
    department: 'Customer Success',
    budget: 150000,
    billable: true,
    priority: 'Low'
  }
];

const ProjectsTab: React.FC<ProjectsTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.projectManager.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Project) => {
    setEditingProject(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      status: record.status,
      dateRange: record.startDate && record.endDate ? [dayjs(record.startDate), dayjs(record.endDate)] : null,
      clientName: record.clientName,
      projectManager: record.projectManager,
      department: record.department,
      budget: record.budget,
      billable: record.billable,
      priority: record.priority,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: Project) => {
    Modal.confirm({
      title: 'Delete Project',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setProjects(prev => prev.filter(project => project.id !== record.id));
          message.success('Project deleted successfully');
        } catch (error) {
          console.error('Error deleting project:', error);
          message.error('Failed to delete project');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Handle date range
      const dateRange = values.dateRange;
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD');
      
      const projectData = {
        ...values,
        startDate,
        endDate,
        dateRange: undefined, // Remove the dateRange field
      };
      
      if (editingProject) {
        // Update existing project
        setProjects(prev => 
          prev.map(project => 
            project.id === editingProject.id 
              ? { ...project, ...projectData }
              : project
          )
        );
        message.success('Project updated successfully');
      } else {
        // Create new project
        const newProject: Project = {
          id: Date.now().toString(),
          ...projectData
        };
        setProjects(prev => [...prev, newProject]);
        message.success('Project created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving project:', error);
      message.error('Failed to save project');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green';
      case 'Planned': return 'blue';
      case 'Completed': return 'purple';
      case 'On Hold': return 'orange';
      case 'Cancelled': return 'red';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'red';
      case 'High': return 'orange';
      case 'Medium': return 'blue';
      case 'Low': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: Project, b: Project) => a.code.localeCompare(b.code),
    },
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      render: (name: string, record: Project) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ProjectOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold' }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Project Manager',
      dataIndex: 'projectManager',
      key: 'projectManager',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      render: (budget: number) => budget ? `€${budget.toLocaleString()}` : '-',
    },
    {
      title: 'Billable',
      dataIndex: 'billable',
      key: 'billable',
      width: 80,
      render: (billable: boolean) => (
        <Tag color={billable ? 'green' : 'gray'}>
          {billable ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Project) => (
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
      data-testid={`${prefixDataTestId || ''}-ProjectsTab`}
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
            {t('hr.project_management', 'Project Management')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-ProjectsTab-AddButton`}
          >
            Add Project
          </Button>
        </div>
        
        <Input
          placeholder="Search projects..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-ProjectsTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredProjects}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} projects`,
        }}
        data-testid={`${prefixDataTestId || ''}-ProjectsTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingProject ? 'Edit Project' : 'Add Project'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        data-testid={`${prefixDataTestId || ''}-ProjectsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-ProjectsTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Project Name"
              name="name"
              rules={[{ required: true, message: 'Please enter project name' }]}
            >
              <Input placeholder="Enter project name" />
            </Form.Item>
            
            <Form.Item
              label="Project Code"
              name="code"
              rules={[{ required: true, message: 'Please enter project code' }]}
            >
              <Input placeholder="e.g., XPR-2024" />
            </Form.Item>
          </div>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter project description (optional)" 
              rows={3}
            />
          </Form.Item>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status">
                <Option value="Active">Active</Option>
                <Option value="Planned">Planned</Option>
                <Option value="Completed">Completed</Option>
                <Option value="On Hold">On Hold</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Priority"
              name="priority"
              rules={[{ required: true, message: 'Please select priority' }]}
            >
              <Select placeholder="Select priority">
                <Option value="Low">Low</Option>
                <Option value="Medium">Medium</Option>
                <Option value="High">High</Option>
                <Option value="Critical">Critical</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Project Duration"
            name="dateRange"
          >
            <RangePicker 
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Client Name"
              name="clientName"
            >
              <Input placeholder="e.g., Internal, Client Company" />
            </Form.Item>
            
            <Form.Item
              label="Project Manager"
              name="projectManager"
              rules={[{ required: true, message: 'Please enter project manager' }]}
            >
              <Input placeholder="Enter project manager name" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Department"
              name="department"
              rules={[{ required: true, message: 'Please select department' }]}
            >
              <Select placeholder="Select department">
                <Option value="Engineering">Engineering</Option>
                <Option value="Product">Product</Option>
                <Option value="Design">Design</Option>
                <Option value="Marketing">Marketing</Option>
                <Option value="Sales">Sales</Option>
                <Option value="Data Science">Data Science</Option>
                <Option value="Security">Security</Option>
                <Option value="Customer Success">Customer Success</Option>
                <Option value="HR">Human Resources</Option>
                <Option value="Finance">Finance</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Budget (€)"
              name="budget"
            >
              <Input 
                type="number" 
                placeholder="Enter budget amount"
                min={0}
              />
            </Form.Item>
          </div>
          
          <Form.Item
            label="Billable"
            name="billable"
            valuePropName="checked"
          >
            <input type="checkbox" />
            <span style={{ marginLeft: '8px' }}>This project is billable to client</span>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { ProjectsTab }; 