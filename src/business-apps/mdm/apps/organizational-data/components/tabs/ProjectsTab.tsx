import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  Button, 
  Space, 
  Typography, 
  message, 
  Modal, 
  Form, 
  Select, 
  Tag, 
  Input,
  Spin,
  Alert,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ProjectOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useProjects } from '../../hooks';
import { Project } from '../../types';

const { Title } = Typography;
const { Option } = Select;

export interface ProjectsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({ 
  prefixDataTestId,
  ...context
}) => {
  const { t } = useTranslation();
  
  // Data integration
  const {
    projects,
    isLoading,
    error,
    refetch,
    totalProjects,
    internalProjects,
    externalProjects,
    activeProjects,
    expiredProjects,
    expiringProjects,
    filterProjects
  } = useProjects(context);

  // Local state
  const [searchInput, setSearchInput] = useState('');
  const [selectedProjectType, setSelectedProjectType] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Active' | 'Expired' | 'Expiring Soon'>('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  // Debounce search input
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    return filterProjects(debouncedSearchTerm, selectedProjectType, selectedStatus);
  }, [filterProjects, debouncedSearchTerm, selectedProjectType, selectedStatus]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Project) => {
    setEditingProject(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      projectType: record.projectType,
      validTo: record.validTo,
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
          // TODO: Implement delete API call when process API is available
          message.success('Project deletion requested - this will be implemented with process API');
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
      
      if (editingProject) {
        // TODO: Implement update API call when process API is available
        message.success('Project update requested - this will be implemented with process API');
      } else {
        // TODO: Implement create API call when process API is available
        message.success('Project creation requested - this will be implemented with process API');
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
      case 'Expired': return 'red';
      case 'Expiring Soon': return 'orange';
      default: return 'default';
    }
  };

  const getProjectTypeColor = (type: string) => {
    return type === 'INTERNAL' ? 'blue' : 'purple';
  };

  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      render: (name: string, record: Project) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ProjectOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            {record.description && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {record.description.length > 50 
                  ? `${record.description.substring(0, 50)}...` 
                  : record.description
                }
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'projectType',
      key: 'projectType',
      width: 100,
      filters: [
        { text: 'Internal', value: 'INTERNAL' },
        { text: 'External', value: 'EXTERNAL' },
      ],
      onFilter: (value: any, record: Project) => record.projectType === value,
      render: (type: string) => (
        <Tag color={getProjectTypeColor(type)}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Expiring Soon', value: 'Expiring Soon' },
        { text: 'Expired', value: 'Expired' },
      ],
      onFilter: (value: any, record: Project) => record.status === value,
      render: (status: string, record: Project) => (
        <div>
          <Tag color={getStatusColor(status)}>
            {status}
          </Tag>
          {record.daysUntilExpiry !== undefined && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              {record.daysUntilExpiry > 0 
                ? `${record.daysUntilExpiry} days left`
                : `${Math.abs(record.daysUntilExpiry)} days ago`
              }
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Valid Until',
      dataIndex: 'formattedValidTo',
      key: 'validTo',
      width: 120,
      sorter: (a: Project, b: Project) => {
        if (!a.validTo && !b.validTo) return 0;
        if (!a.validTo) return 1;
        if (!b.validTo) return -1;
        return new Date(a.validTo).getTime() - new Date(b.validTo).getTime();
      },
      render: (formattedDate: string, record: Project) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {formattedDate ? (
            <>
              <CalendarOutlined style={{ marginRight: '4px', color: '#666' }} />
              <span>{formattedDate}</span>
            </>
          ) : (
            <span style={{ color: '#999', fontStyle: 'italic' }}>No expiry</span>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Project) => (
        <Space size="small">
          <Tooltip title="Edit Project">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Project">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              size="small"
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId || ''}-ProjectsTab`}
        style={{ 
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
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
        <Alert
          message="Error Loading Projects"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              <ReloadOutlined /> Retry
            </Button>
          }
        />
      </div>
    );
  }

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
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
              {t('hr.project_management', 'Project Management')}
            </Title>
            <Tag color="blue">{totalProjects} projects</Tag>
            <Tag color="green">{activeProjects} active</Tag>
            <Tag color="orange">{expiringProjects} expiring</Tag>
            <Tag color="red">{expiredProjects} expired</Tag>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-ProjectsTab-AddButton`}
          >
            Add Project
          </Button>
        </div>
        
        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search projects..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={handleSearchChange}
            style={{ width: '300px' }}
            allowClear
            data-testid={`${prefixDataTestId || ''}-ProjectsTab-SearchInput`}
          />
          
          <Select
            value={selectedProjectType}
            onChange={setSelectedProjectType}
            style={{ width: '140px' }}
            placeholder="Project Type"
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Types</Option>
            <Option value="INTERNAL">Internal ({internalProjects})</Option>
            <Option value="EXTERNAL">External ({externalProjects})</Option>
          </Select>
          
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: '160px' }}
            placeholder="Status"
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Status</Option>
            <Option value="Active">Active ({activeProjects})</Option>
            <Option value="Expiring Soon">Expiring Soon ({expiringProjects})</Option>
            <Option value="Expired">Expired ({expiredProjects})</Option>
          </Select>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            title="Refresh data"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredProjects}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} projects`,
        }}
        data-testid={`${prefixDataTestId || ''}-ProjectsTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
        scroll={{ x: 800 }}
        locale={{
          emptyText: searchInput || selectedProjectType !== 'ALL' || selectedStatus !== 'ALL'
            ? 'No projects match your search criteria'
            : 'No projects found'
        }}
      />

      {/* Modal for Add/Edit */}
      <Modal
        title={editingProject ? 'Edit Project' : 'Add Project'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-ProjectsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-ProjectsTab-Form`}
        >
          <Form.Item
            label="Project Name"
            name="name"
            rules={[{ required: true, message: 'Please enter project name' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>
          
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
              label="Project Type"
              name="projectType"
              rules={[{ required: true, message: 'Please select project type' }]}
            >
              <Select placeholder="Select project type">
                <Option value="INTERNAL">Internal</Option>
                <Option value="EXTERNAL">External</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Valid Until"
              name="validTo"
            >
              <Input 
                type="datetime-local"
                placeholder="Select expiry date (optional)"
              />
            </Form.Item>
          </div>
        </Form>
        
        <Alert
          message="CRUD Operations"
          description="Create, Update, and Delete operations will be implemented when the process API is available."
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Modal>
    </div>
  );
};

export default ProjectsTab; 