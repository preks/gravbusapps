import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  Tree, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Input, 
  Modal, 
  Form, 
  message,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  FolderOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useJobFamilies } from '../../hooks';
import { JobFamily } from '../../types';

const { Title, Text } = Typography;
const { Search } = Input;

export interface JobFamiliesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const JobFamiliesTab: React.FC<JobFamiliesTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const {
    rootFamilies,
    allFamilies,
    expandedIds,
    isLoading,
    error,
    refetch,
    toggleFamilyExpansion,
    expandToLevel,
    collapseAll,
    getFamilyById,
    searchFamilies
  } = useJobFamilies(context);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFamily, setEditingFamily] = useState<JobFamily | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [form] = Form.useForm();

  // Convert JobFamily to Ant Design Tree DataNode
  const convertToTreeData = (families: JobFamily[]): DataNode[] => {
    return families.map(family => ({
      key: family.id,
      title: (
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
          <div className="gba:flex gba:items-center gba:space-x-3">
            <div>
              <Text strong className="gba:text-base">{family.name}</Text>
              <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
                <Tag color="blue" className="gba:text-xs">
                  {family.code}
                </Tag>
                {family.hasChildren && (
                  <Tag color="green" className="gba:text-xs">
                    {family.children.length} children
                  </Tag>
                )}
                <Tag color="orange" className="gba:text-xs">
                  Level {family.level}
                </Tag>
              </div>
              {family.description && (
                <Text type="secondary" className="gba:text-sm gba:block gba:mt-1">
                  {family.description}
                </Text>
              )}
            </div>
          </div>
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Add Child Family">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddChild(family.id)}
                data-testid={`${prefixDataTestId}-add-child-${family.id}`}
              />
            </Tooltip>
            <Tooltip title="Edit Family">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditFamily(family)}
                data-testid={`${prefixDataTestId}-edit-family-${family.id}`}
              />
            </Tooltip>
            <Tooltip title="Delete Family">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteFamily(family)}
                data-testid={`${prefixDataTestId}-delete-family-${family.id}`}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      icon: family.hasChildren 
        ? (expandedIds.has(family.id) ? <FolderOpenOutlined /> : <FolderOutlined />)
        : <FolderOutlined />,
      children: family.hasChildren ? convertToTreeData(family.children) : undefined,
      isLeaf: !family.hasChildren
    }));
  };

  const handleAddRoot = () => {
    setEditingFamily(null);
    setSelectedParentId('');
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingFamily(null);
    setSelectedParentId(parentId);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditFamily = (family: JobFamily) => {
    setEditingFamily(family);
    setSelectedParentId(family.parentEntryId || '');
    form.setFieldsValue({
      name: family.name,
      code: family.code,
      description: family.description,
      parentId: family.parentEntryId
    });
    setIsModalVisible(true);
  };

  const handleDeleteFamily = (family: JobFamily) => {
    const hasChildren = family.hasChildren;
    const title = 'Delete Job Family';
    const content = hasChildren
      ? `Are you sure you want to delete "${family.name}"? This will also delete all child families.`
      : `Are you sure you want to delete job family "${family.name}"?`;

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
      
      if (editingFamily) {
        message.warning('Edit family functionality will be implemented with process API integration');
      } else {
        message.warning('Add family functionality will be implemented with process API integration');
      }
      
      setIsModalVisible(false);
      await refetch();
    } catch (error) {
      console.error('Error saving:', error);
      message.error('Failed to save family');
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
    // Update expansion state based on tree interaction
    expandedKeys.forEach(key => {
      if (!expandedIds.has(key as string)) {
        toggleFamilyExpansion(key as string);
      }
    });
    
    // Handle collapse
    Array.from(expandedIds).forEach(id => {
      if (!expandedKeys.includes(id)) {
        toggleFamilyExpansion(id);
      }
    });
  };

  // Filter tree data based on search
  const getFilteredTreeData = () => {
    if (!searchQuery.trim()) {
      return convertToTreeData(rootFamilies);
    }

    const matchingFamilies = searchFamilies(searchQuery);
    const filteredRoots = rootFamilies.filter(root => 
      matchingFamilies.some(match => 
        match.id === root.id || match.id.startsWith(root.id)
      )
    );

    return convertToTreeData(filteredRoots);
  };

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Typography.Text type="danger">Error loading job families: {error}</Typography.Text>
        <div className="gba:mt-4">
          <Button onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div>
          <Title level={3} className="gba:mb-2">Job Families</Title>
          <Text type="secondary">
            Manage job families in a hierarchical structure. Job families help categorize and organize different types of roles.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddRoot}
          data-testid={`${prefixDataTestId}-add-root-family`}
        >
          Add Root Family
        </Button>
      </div>

      <div className="gba:mb-4 gba:flex gba:items-center gba:space-x-4">
        <Search
          placeholder="Search job families..."
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
      </div>

            <Card className="gba:min-h-96">
        {rootFamilies.length === 0 && !isLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">No job families found</Text>
                <div className="gba:mt-2">
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoot}>
                    Create First Job Family
                  </Button>
                </div>
              </div>
            }
          />
        ) : isLoading ? (
          <div className="gba:text-center gba:py-8">
            <Typography.Text>Loading job families...</Typography.Text>
          </div>
        ) : (
          <Tree
            showIcon
            showLine={{ showLeafIcon: false }}
            expandedKeys={Array.from(expandedIds)}
            onExpand={handleExpand}
            treeData={getFilteredTreeData()}
            className="gba:job-families-tree"
            blockNode
          />
        )}
      </Card>

      <Modal
        title={editingFamily ? 'Edit Job Family' : 'Add Job Family'}
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
            label="Family Name"
            rules={[{ required: true, message: 'Please enter family name' }]}
          >
            <Input placeholder="e.g., Engineering, Sales, Marketing" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label="Code"
            rules={[{ required: true, message: 'Please enter code' }]}
          >
            <Input placeholder="e.g., ENG, SALES, MKT" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea 
              placeholder="Describe this job family and the types of roles it contains"
              rows={3}
            />
          </Form.Item>

          {selectedParentId && (
            <Form.Item label="Parent Family">
              <Input 
                value={getFamilyById(selectedParentId)?.name || 'Unknown'} 
                disabled 
                placeholder="This will be a child of the selected family"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default JobFamiliesTab; 