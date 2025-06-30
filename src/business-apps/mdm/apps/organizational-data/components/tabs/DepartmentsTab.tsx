import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Tree, 
  Button, 
  Input, 
  Space, 
  Typography, 
  message, 
  Modal, 
  Form, 
  Tag, 
  Spin, 
  Alert,
  Tooltip,
  Empty,
  Descriptions,
  Card,
  List,
  Avatar,
  Progress
} from 'antd';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ApartmentOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  BankOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  BuildOutlined,
  BarChartOutlined,
  DollarOutlined,
  IdcardOutlined,
  PartitionOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useDepartments } from '../../hooks';
import { Department } from '../../types';

const { Title, Text } = Typography;

export interface DepartmentsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const DepartmentsTab: React.FC<DepartmentsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const {
    rootDepartments,
    allDepartments,
    expandedIds,
    isLoading,
    error,
    refetch,
    setExpandedIds,
    expandToLevel,
    collapseAll,
    getDepartmentByNodeId,
    searchDepartments,
    totalDepartments,
    teams,
    departments,
    activeDepartments,
    departmentsWithSupervisors,
    totalEmployeeCount
  } = useDepartments(context);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  // Convert Department to Ant Design Tree DataNode
  const convertToTreeData = (departments: Department[]): DataNode[] => {
    return departments.map(department => ({
      key: department.nodeId,
      title: (
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
          <div className="gba:flex gba:items-center gba:space-x-3">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <ApartmentOutlined className={department.type === 'DEPARTMENT' ? 'gba:text-blue-500' : 'gba:text-purple-500'} />
              <Tag color={department.type === 'DEPARTMENT' ? 'blue' : 'purple'} className="gba:text-xs">
                {department.type}
              </Tag>
            </div>
            <div>
              <Text strong className="gba:text-base">{department.name}</Text>
              {department.code && (
                <Tag color="cyan" className="gba:ml-2 gba:text-xs">
                  {department.code}
                </Tag>
              )}
              <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
                <Tag color="green" className="gba:text-xs" icon={<UserOutlined />}>
                  {department.numberOfAssignedEmployees} employees
                </Tag>
                {department.numberOfChildUnits > 0 && (
                  <Tag color="orange" className="gba:text-xs" icon={<TeamOutlined />}>
                    {department.numberOfChildUnits} sub-units
                  </Tag>
                )}
                {department.numberOfOpenJobPositions > 0 && (
                  <Tag color="red" className="gba:text-xs">
                    {department.numberOfOpenJobPositions} open positions
                  </Tag>
                )}
                <Tag color="default" className="gba:text-xs">
                  Level {department.level}
                </Tag>
              </div>
              {department.description && (
                <Text type="secondary" className="gba:text-sm gba:block gba:mt-1">
                  {department.description}
                </Text>
              )}
              <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2">
                {department.supervisorName && (
                  <div className="gba:flex gba:items-center gba:space-x-1 gba:text-xs gba:text-gray-600">
                    <CrownOutlined />
                    <Text type="secondary">{department.supervisorName} ({department.supervisorRole})</Text>
                  </div>
                )}
                {department.companyName && (
                  <div className="gba:flex gba:items-center gba:space-x-1 gba:text-xs gba:text-gray-600">
                    <BankOutlined />
                    <Text type="secondary">{department.companyName}</Text>
                  </div>
                )}
                {department.costCenterName && (
                  <Tag color="gold" className="gba:text-xs">
                    Cost Center: {department.costCenterName}
                  </Tag>
                )}
              </div>
              {department.parentDepartmentName && (
                <Text type="secondary" className="gba:text-xs gba:block">
                  Parent: {department.parentDepartmentName}
                </Text>
              )}
            </div>
          </div>
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Add Sub-Department">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddSubDepartment(department.nodeId)}
                data-testid={`${prefixDataTestId}-add-sub-department-${department.nodeId}`}
              />
            </Tooltip>
            <Tooltip title="Edit Department">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditDepartment(department)}
                data-testid={`${prefixDataTestId}-edit-department-${department.nodeId}`}
              />
            </Tooltip>
            <Tooltip title="Delete Department">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteDepartment(department)}
                data-testid={`${prefixDataTestId}-delete-department-${department.nodeId}`}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      icon: department.children.length > 0 
        ? (expandedIds.has(department.nodeId) ? <FolderOpenOutlined /> : <FolderOutlined />)
        : <ApartmentOutlined />,
      children: department.children.length > 0 ? convertToTreeData(department.children) : undefined,
      isLeaf: department.children.length === 0
    }));
  };

  const handleAddRoot = () => {
    setEditingDepartment(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleAddSubDepartment = (parentNodeId: string) => {
    setEditingDepartment(null);
    form.resetFields();
    form.setFieldsValue({ parentNodeId });
    setIsModalVisible(true);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    form.setFieldsValue({
      name: department.name,
      code: department.code,
      description: department.description,
      type: department.type,
      parentNodeId: department.parentNodeId
    });
    setIsModalVisible(true);
  };

  const handleDeleteDepartment = (department: Department) => {
    const hasChildren = department.children.length > 0;
    const title = 'Delete Department';
    const content = hasChildren
      ? `Are you sure you want to delete "${department.name}"? This will also delete all sub-departments.`
      : `Are you sure you want to delete department "${department.name}"?`;

    Modal.confirm({
      title,
      content,
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
      const values = await form.validateFields();
      
      if (editingDepartment) {
        message.warning('Edit department functionality will be implemented with process API integration');
      } else {
        message.warning('Add department functionality will be implemented with process API integration');
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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedIds(new Set(expandedKeys.map(key => String(key))));
  };

  const handleNodeSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const nodeId = selectedKeys[0].toString();
      const department = getDepartmentByNodeId(nodeId);
      if (department) {
        setSelectedDepartment(department);
        setDrawerVisible(true);
      }
    }
  }, [getDepartmentByNodeId]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
    setTimeout(() => {
      setSelectedDepartment(null);
    }, 300); // Clear selected department after drawer close animation completes
  }, []);

  const getFilteredTreeData = () => {
    if (!searchQuery) {
      return convertToTreeData(rootDepartments);
    }

    const filteredDepartments = searchDepartments(searchQuery);
    return convertToTreeData(filteredDepartments);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEPARTMENT':
        return 'blue';
      case 'TEAM':
        return 'purple';
      default:
        return 'default';
    }
  };

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
        message="Error Loading Departments"
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
    <div
      data-testid={`${prefixDataTestId || ''}-DepartmentsTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            Departments & Teams
          </Title>
          <Tag color="blue">{totalDepartments} total</Tag>
          <Tag color="blue">{departments} departments</Tag>
          <Tag color="purple">{teams} teams</Tag>
          <Tag color="green">{activeDepartments} active</Tag>
          <Tag color="orange">{departmentsWithSupervisors} with supervisor</Tag>
          <Tag color="cyan">{totalEmployeeCount} employees</Tag>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddRoot}
          data-testid={`${prefixDataTestId || ''}-DepartmentsTab-AddButton`}
        >
          Add Department
        </Button>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        gap: '16px'
      }}>
        <Input
          placeholder={t('hr.search_departments', 'Search departments and teams...')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          prefix={<ApartmentOutlined />}
          style={{ maxWidth: 400 }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-DepartmentsTab-SearchInput`}
        />
        
        <Space>
          <Button
            icon={<ExpandAltOutlined />}
            onClick={() => expandToLevel(2)}
            data-testid={`${prefixDataTestId || ''}-DepartmentsTab-ExpandAllButton`}
          >
            Expand All
          </Button>
          <Button
            icon={<CompressOutlined />}
            onClick={collapseAll}
            data-testid={`${prefixDataTestId || ''}-DepartmentsTab-CollapseAllButton`}
          >
            Collapse All
          </Button>
        </Space>
      </div>

      {/* Tree */}
      {rootDepartments.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Tree
            treeData={getFilteredTreeData()}
            expandedKeys={Array.from(expandedIds)}
            onExpand={handleExpand}
            onSelect={handleNodeSelect}
            showIcon
            blockNode
            data-testid={`${prefixDataTestId || ''}-DepartmentsTab-Tree`}
          />
        </div>
      ) : (
        <Empty
          description="No departments found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoot}>
            Add First Department
          </Button>
        </Empty>
      )}

      {/* Modal for Add/Edit */}
      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-DepartmentsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-DepartmentsTab-Form`}
        >
          <Form.Item
            label="Department Name"
            name="name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="Enter department name" />
          </Form.Item>
          
          <Form.Item
            label="Department Code"
            name="code"
          >
            <Input placeholder="Enter department code (optional)" />
          </Form.Item>

          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true, message: 'Please select department type' }]}
          >
            <Input placeholder="DEPARTMENT or TEAM" />
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter department description (optional)" 
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Parent Department ID"
            name="parentNodeId"
          >
            <Input placeholder="Enter parent department node ID (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Department Details Drawer */}
      <DataDetailsDrawer
        title={`${selectedDepartment?.type === 'DEPARTMENT' ? 'Department' : 'Team'} Details`}
        icon={selectedDepartment?.type === 'DEPARTMENT' ? 
          <ApartmentOutlined className="gba:text-blue-500" /> : 
          <TeamOutlined className="gba:text-purple-500" />}
        placement="right"
        onClose={handleCloseDrawer}
        open={drawerVisible}
        width={450}
        dataTestId={`${prefixDataTestId || ''}-DepartmentsTab-Drawer`}
        className="gba:text-base"
      >
        {selectedDepartment && (
          <div className="gba:space-y-6">
            {/* Basic Information */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><InfoCircleOutlined /> Basic Information</span>}
              className="gba:shadow-sm"
            >
              <Descriptions column={1} size="small" layout="vertical">
                <Descriptions.Item label="Name">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Text strong className="gba:text-lg">{selectedDepartment.name || '-'}</Text>
                  </div>
                </Descriptions.Item>
                
                {selectedDepartment.code && (
                  <Descriptions.Item label="Code">
                    <Tag color="blue">{selectedDepartment.code}</Tag>
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label="Type">
                  <Tag color={getTypeColor(selectedDepartment.type)}>
                    {selectedDepartment.type}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Status">
                  <Tag color={selectedDepartment.status === 'Active' ? 'green' : 'red'}>
                    {selectedDepartment.status}
                  </Tag>
                </Descriptions.Item>
                
                {selectedDepartment.description && (
                  <Descriptions.Item label="Description">
                    {selectedDepartment.description}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Parent Department Information (if available) */}
            {selectedDepartment.parentDepartmentName && (
              <Card
                title={<span className="gba:flex gba:items-center gba:gap-2"><PartitionOutlined /> Parent Department</span>}
                className="gba:shadow-sm"
              >
                <div className="gba:p-2 gba:bg-gray-50 gba:rounded gba:space-y-2">
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Parent Department</div>
                    <Text strong>{selectedDepartment.parentDepartmentName}</Text>
                  </div>
                  {selectedDepartment.parentNodeId && (
                    <div>
                      <div className="gba:text-sm gba:text-gray-500">Parent Node ID</div>
                      <Text copyable>{selectedDepartment.parentNodeId}</Text>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Company & Cost Center */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><BankOutlined /> Company & Cost Center</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-4">
                {selectedDepartment.companyName ? (
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Company</div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <BankOutlined className="gba:text-blue-500" />
                      <Text strong>{selectedDepartment.companyName}</Text>
                    </div>
                    {selectedDepartment.companyId && (
                      <div className="gba:text-sm gba:text-gray-500 gba:mt-1">
                        ID: <Text copyable>{selectedDepartment.companyId}</Text>
                      </div>
                    )}
                  </div>
                ) : (
                  <Empty description="No company assigned" />
                )}

                {selectedDepartment.costCenterName ? (
                  <div className="gba:mt-2">
                    <div className="gba:text-sm gba:text-gray-500">Cost Center</div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <DollarOutlined className="gba:text-green-500" />
                      <Text strong>{selectedDepartment.costCenterName}</Text>
                    </div>
                    {selectedDepartment.costCenterId && (
                      <div className="gba:text-sm gba:text-gray-500 gba:mt-1">
                        ID: <Text copyable>{selectedDepartment.costCenterId}</Text>
                      </div>
                    )}
                  </div>
                ) : (
                  <Empty description="No cost center assigned" className="gba:mt-2" />
                )}
              </div>
            </Card>

            {/* Supervisor Information */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><CrownOutlined /> Supervisor</span>}
              className="gba:shadow-sm"
            >
              {selectedDepartment.supervisorName ? (
                <div className="gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Avatar icon={<UserOutlined />} size="large" />
                    <div>
                      <Text strong className="gba:text-lg">{selectedDepartment.supervisorName}</Text>
                      {selectedDepartment.supervisorRole && (
                        <div className="gba:text-sm gba:text-gray-500">
                          {selectedDepartment.supervisorRole}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedDepartment.supervisorJobPosition && (
                    <div className="gba:mt-2">
                      <div className="gba:text-sm gba:text-gray-500">Job Position</div>
                      <Text>{selectedDepartment.supervisorJobPosition}</Text>
                    </div>
                  )}
                  
                  {selectedDepartment.supervisorId && (
                    <div className="gba:mt-1">
                      <div className="gba:text-sm gba:text-gray-500">Supervisor ID</div>
                      <Text copyable>{selectedDepartment.supervisorId}</Text>
                    </div>
                  )}
                </div>
              ) : (
                <Empty description="No supervisor assigned" />
              )}
            </Card>

            {/* Job Positions & Employees Statistics */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><BarChartOutlined /> Statistics</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-4">
                {/* Job Positions */}
                <div>
                  <div className="gba:text-sm gba:text-gray-500 gba:mb-1">Job Positions</div>
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <div>
                      <div className="gba:text-xs gba:text-gray-500">Assigned</div>
                      <div className="gba:text-lg gba:font-semibold">
                        {selectedDepartment.numberOfAssignedJobPositions}
                      </div>
                    </div>
                    <div>
                      <div className="gba:text-xs gba:text-gray-500">Open</div>
                      <div className="gba:text-lg gba:font-semibold">
                        {selectedDepartment.numberOfOpenJobPositions}
                      </div>
                    </div>
                    <div>
                      <div className="gba:text-xs gba:text-gray-500">Total</div>
                      <div className="gba:text-lg gba:font-semibold">
                        {selectedDepartment.numberOfTotalJobPositions}
                      </div>
                    </div>
                    <div>
                      <div className="gba:text-xs gba:text-gray-500">Child Units</div>
                      <div className="gba:text-lg gba:font-semibold">
                        {selectedDepartment.numberOfChildUnits}
                      </div>
                    </div>
                  </div>

                  {/* Fill rate visualization */}
                  <div className="gba:mt-3">
                    <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
                      <div className="gba:text-xs gba:text-gray-500">Fill Rate</div>
                      <div className="gba:text-xs gba:font-medium">
                        {selectedDepartment.numberOfTotalJobPositions > 0 ? 
                          Math.round((selectedDepartment.numberOfAssignedJobPositions / selectedDepartment.numberOfTotalJobPositions) * 100) : 0}%
                      </div>
                    </div>
                    <Progress 
                      percent={
                        selectedDepartment.numberOfTotalJobPositions > 0 ? 
                          Math.round((selectedDepartment.numberOfAssignedJobPositions / selectedDepartment.numberOfTotalJobPositions) * 100) : 0
                      } 
                      size="small"
                      status={selectedDepartment.numberOfOpenJobPositions > 0 ? "active" : "success"}
                    />
                  </div>
                </div>

                {/* Employees */}
                <div>
                  <div className="gba:text-sm gba:text-gray-500 gba:mb-2">Employee Count</div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Avatar 
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1677ff' }} 
                    />
                    <Text strong className="gba:text-lg">
                      {selectedDepartment.numberOfAssignedEmployees}
                    </Text>
                    <Text type="secondary" className="gba:text-sm">
                      employees assigned
                    </Text>
                  </div>
                </div>
                
                {/* Hierarch Level */}
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div>
                    <div className="gba:text-xs gba:text-gray-500">Hierarchy Level</div>
                    <div className="gba:text-lg gba:font-semibold">
                      Level {selectedDepartment.level}
                    </div>
                  </div>
                  
                  {selectedDepartment.rank !== undefined && (
                    <div>
                      <div className="gba:text-xs gba:text-gray-500">Rank</div>
                      <div className="gba:text-lg gba:font-semibold">
                        {selectedDepartment.rank}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Technical Information */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><BuildOutlined /> Technical Information</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-3">
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Organization Unit ID</div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Text copyable>{selectedDepartment.organizationUnitId}</Text>
                  </div>
                </div>

                <div>
                  <div className="gba:text-sm gba:text-gray-500">Node ID</div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Text copyable>{selectedDepartment.nodeId}</Text>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="gba:flex gba:gap-2">
              <Button 
                icon={<EditOutlined />} 
                onClick={() => {
                  handleEditDepartment(selectedDepartment);
                  handleCloseDrawer();
                }}
                data-testid={`${prefixDataTestId || ''}-DepartmentsTab-EditButton`}
              >
                Edit
              </Button>
              <Button 
                icon={<DeleteOutlined />} 
                danger 
                onClick={() => {
                  handleCloseDrawer();
                  handleDeleteDepartment(selectedDepartment);
                }}
                data-testid={`${prefixDataTestId || ''}-DepartmentsTab-DeleteButton`}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export default DepartmentsTab;
export { DepartmentsTab };