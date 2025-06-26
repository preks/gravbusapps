import React, { useState } from 'react';
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
  Descriptions
} from 'antd';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  BankOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCompanies } from '../../hooks';
import { Company } from '../../types';

const { Title, Text } = Typography;
const { Search } = Input;

export interface CompaniesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const CompaniesTab: React.FC<CompaniesTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const {
    rootCompanies,
    allCompanies,
    expandedIds,
    isLoading,
    error,
    refetch,
    setExpandedIds,
    expandToLevel,
    collapseAll,
    getCompanyByNodeId,
    searchCompanies
  } = useCompanies(context);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  // Convert Company to Ant Design Tree DataNode
  const convertToTreeData = (companies: Company[]): DataNode[] => {
    return companies.map(company => ({
      key: company.nodeId,
      title: (
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
          <div className="gba:flex gba:items-center gba:space-x-3">
            <BankOutlined className="gba:text-blue-500" />
            <div>
              <Text strong className="gba:text-base">{company.name}</Text>
              <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
                <Tag color="blue" className="gba:text-xs">
                  {company.code}
                </Tag>
                {company.children.length > 0 && (
                  <Tag color="green" className="gba:text-xs">
                    {company.children.length} subsidiaries
                  </Tag>
                )}
                <Tag color="orange" className="gba:text-xs">
                  Level {company.level}
                </Tag>
                {company.numberOfAssignedEmployees > 0 && (
                  <Tag color="purple" className="gba:text-xs" icon={<UserOutlined />}>
                    {company.numberOfAssignedEmployees} employees
                  </Tag>
                )}
                {company.numberOfChildUnits > 0 && (
                  <Tag color="cyan" className="gba:text-xs" icon={<TeamOutlined />}>
                    {company.numberOfChildUnits} units
                  </Tag>
                )}
              </div>
              {company.description && (
                <Text type="secondary" className="gba:text-sm gba:block gba:mt-1">
                  {company.description}
                </Text>
              )}
              {company.parentCompanyName && (
                <Text type="secondary" className="gba:text-xs gba:block">
                  Parent: {company.parentCompanyName}
                </Text>
              )}
            </div>
          </div>
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Add Subsidiary">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddSubsidiary(company.nodeId)}
                data-testid={`${prefixDataTestId}-add-subsidiary-${company.nodeId}`}
              />
            </Tooltip>
            <Tooltip title="Edit Company">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditCompany(company)}
                data-testid={`${prefixDataTestId}-edit-company-${company.nodeId}`}
              />
            </Tooltip>
            <Tooltip title="Delete Company">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteCompany(company)}
                data-testid={`${prefixDataTestId}-delete-company-${company.nodeId}`}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      icon: company.children.length > 0 
        ? (expandedIds.has(company.nodeId) ? <FolderOpenOutlined /> : <FolderOutlined />)
        : <BankOutlined />,
      children: company.children.length > 0 ? convertToTreeData(company.children) : undefined,
      isLeaf: company.children.length === 0
    }));
  };

  const handleAddRoot = () => {
    setEditingCompany(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleAddSubsidiary = (parentNodeId: string) => {
    setEditingCompany(null);
    form.resetFields();
    form.setFieldsValue({ parentNodeId });
    setIsModalVisible(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      code: company.code,
      description: company.description,
      parentNodeId: company.parentNodeId
    });
    setIsModalVisible(true);
  };

  const handleDeleteCompany = (company: Company) => {
    const hasChildren = company.children.length > 0;
    const title = 'Delete Company';
    const content = hasChildren
      ? `Are you sure you want to delete "${company.name}"? This will also delete all subsidiary companies.`
      : `Are you sure you want to delete company "${company.name}"?`;

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
      
      if (editingCompany) {
        message.warning('Edit company functionality will be implemented with process API integration');
      } else {
        message.warning('Add company functionality will be implemented with process API integration');
      }
      
      setIsModalVisible(false);
      await refetch();
    } catch (error) {
      console.error('Error saving:', error);
      message.error('Failed to save company');
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
    // Directly set the expanded IDs to match the tree component
    const newExpandedIds = new Set(expandedKeys.map(key => key.toString()));
    setExpandedIds(newExpandedIds);
  };

  // Filter tree data based on search
  const getFilteredTreeData = () => {
    if (!searchQuery.trim()) {
      return convertToTreeData(rootCompanies);
    }

    const matchingCompanies = searchCompanies(searchQuery);
    const filteredRoots = rootCompanies.filter(root => 
      matchingCompanies.some(match => 
        match.nodeId === root.nodeId || match.nodeId.startsWith(root.nodeId)
      )
    );

    return convertToTreeData(filteredRoots);
  };

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert
          message="Error Loading Companies"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div>
          <Title level={3} className="gba:mb-2">Companies</Title>
          <Text type="secondary">
            Manage companies in a hierarchical structure. Companies represent the organizational structure of your business.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRoot}
          data-testid={`${prefixDataTestId}-add-root-company`}
        >
          Add Root Company
        </Button>
      </div>

      <div className="gba:mb-4 gba:flex gba:items-center gba:space-x-4">
        <Search
          placeholder="Search companies..."
          allowClear
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
        <Space>
          <Tooltip title="Expand All Levels">
            <Button
              icon={<ExpandAltOutlined />}
              onClick={() => expandToLevel(3)}
              data-testid={`${prefixDataTestId}-expand-all`}
            >
              Expand All
            </Button>
          </Tooltip>
          <Tooltip title="Collapse All">
            <Button
              icon={<CompressOutlined />}
              onClick={collapseAll}
              data-testid={`${prefixDataTestId}-collapse-all`}
            >
              Collapse All
            </Button>
          </Tooltip>
        </Space>
        {allCompanies.length > 0 && (
          <Tag color="blue">{allCompanies.length} companies total</Tag>
        )}
      </div>

      <div className="gba:bg-white gba:rounded-lg gba:shadow-sm gba:min-h-96">
        {rootCompanies.length === 0 && !isLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">No companies found</Text>
                <div className="gba:mt-2">
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoot}>
                    Create First Company
                  </Button>
                </div>
              </div>
            }
          />
        ) : isLoading ? (
          <div className="gba:text-center gba:py-8">
            <Spin size="large" />
            <div className="gba:mt-4">
              <Typography.Text>Loading companies...</Typography.Text>
            </div>
          </div>
        ) : (
          <Tree
            showIcon
            showLine={{ showLeafIcon: false }}
            expandedKeys={Array.from(expandedIds)}
            onExpand={handleExpand}
            onSelect={(selectedKeys, info) => {
              if (selectedKeys.length > 0 && info.node) {
                // Extract the company key/id from the selected node
                const nodeKey = selectedKeys[0].toString();
                // Find the matching company object
                const company = getCompanyByNodeId(nodeKey);
                if (company) {
                  setSelectedCompany(company);
                  setDrawerVisible(true);
                }
              }
            }}
            treeData={getFilteredTreeData()}
            className="gba:companies-tree gba:p-4"
            blockNode
          />
        )}
      </div>

      <Modal
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          className="gba:mt-4"
        >
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="e.g., NEWWORK SE, XING GmbH" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label="Company Code"
            rules={[{ required: true, message: 'Please enter company code' }]}
          >
            <Input placeholder="e.g., NWSE, XING" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea 
              placeholder="Describe this company and its business activities"
              rows={3}
            />
          </Form.Item>

          <Form.Item name="parentNodeId" label="Parent Company" hidden>
            <Input disabled />
          </Form.Item>
        </Form>
      </Modal>

      <DataDetailsDrawer
        title="Company Details"
        icon={<BankOutlined className="gba:text-blue-500" />}
        placement="right"
        onClose={() => {
          setDrawerVisible(false);
          setSelectedCompany(null);
        }}
        open={drawerVisible}
        width={400}
        dataTestId={`${prefixDataTestId}-company-details-drawer`}
      >
        <div className="gba:py-2">
          <Descriptions layout="vertical" column={1} bordered>
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Company Name</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.name || "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Company Code</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.code || "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Structure ID</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.structureId || "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Assigned Employees</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.numberOfAssignedEmployees ?? "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Assigned Job Positions</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.numberOfAssignedJobPositions ?? "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Open Job Positions</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.numberOfOpenJobPositions ?? "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Total Job Positions</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.numberOfTotalJobPositions ?? "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Child Units</span>}
              className="gba:py-2 gba:px-4 gba:border-b"
            >
              <span className="gba:text-sm">
                {selectedCompany?.numberOfChildUnits ?? "-"}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<span className="gba:text-sm gba:font-medium">Company Assigned Units</span>}
              className="gba:py-2 gba:px-4"
            >
              <span className="gba:text-sm">
                {selectedCompany?.numberOfCompanyAssignedUnits ?? "-"}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </DataDetailsDrawer>
    </div>
  );
};

export default CompaniesTab; 