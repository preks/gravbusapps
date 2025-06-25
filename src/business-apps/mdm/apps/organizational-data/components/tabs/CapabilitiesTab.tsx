import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, message, Modal, Form, Select, Tag, Spin, Alert, Descriptions, Card, Divider, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TrophyOutlined, InfoCircleOutlined, ApartmentOutlined, OrderedListOutlined, GroupOutlined, TagOutlined, BulbOutlined, BookOutlined, FlagOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';

const { Title, Text } = Typography;
const { Option } = Select;

export interface CapabilityExtended {
  id: string;
  structureId: string;
  name: string;
  description?: string;
  rankInLayer?: number;
  layer: string;
  rankInGroup?: number;
  groupId?: string;
}

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
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
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

  const handleRowClick = useCallback((record: Capability) => {
    setSelectedCapability(record);
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
    setTimeout(() => {
      setSelectedCapability(null);
    }, 300); // Clear selected capability after drawer close animation completes
  }, []);

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
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' }
        })}
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

      {/* Capability Details Drawer */}
      <DataDetailsDrawer
        title="Capability Details"
        icon={<TrophyOutlined className="gba:text-blue-500" />}
        placement="right"
        onClose={handleCloseDrawer}
        open={drawerVisible}
        width={450}
        dataTestId={`${prefixDataTestId || ''}-CapabilitiesTab-Drawer`}
        className="gba:text-base"
      >
        {selectedCapability && (
          <div className="gba:space-y-6">
            {/* Basic Information */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><InfoCircleOutlined /> Basic Information</span>}
              className="gba:shadow-sm"
            >
              <Descriptions column={1} size="small" layout="vertical">
                <Descriptions.Item label="Name">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Text strong className="gba:text-lg">{selectedCapability.name || '-'}</Text>
                  </div>
                </Descriptions.Item>
                
                <Descriptions.Item label="Code">
                  <Tag color="blue">{selectedCapability.code || '-'}</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="Description">
                  {selectedCapability.description || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="Status">
                  <Tag color={selectedCapability.status === 'Active' ? 'green' : 'red'}>
                    {selectedCapability.status || 'Unknown'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Classification */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><TagOutlined /> Classification</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Category</div>
                  <div className="gba:text-base gba:mb-2">{selectedCapability.category || '-'}</div>

                  <div className="gba:text-sm gba:text-gray-500">Competency Area</div>
                  <div className="gba:text-base">{selectedCapability.competencyArea || '-'}</div>
                </div>

                <div>
                  <div className="gba:text-sm gba:text-gray-500">Level</div>
                  <div className="gba:flex gba:items-center gba:mb-2">
                    <Tag color={
                      selectedCapability.level === 'Expert' ? 'gold' : 
                      selectedCapability.level === 'Advanced' ? 'blue' : 
                      'green'
                    }>
                      {selectedCapability.level || '-'}
                    </Tag>
                  </div>

                  <div className="gba:text-sm gba:text-gray-500">Required Level</div>
                  <div className="gba:text-base">{selectedCapability.requiredLevel || '-'}</div>
                </div>
              </div>
            </Card>

            {/* Certification */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><BookOutlined /> Certification</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-base">Certification Required</div>
                <Tag color={selectedCapability.certificationRequired ? 'red' : 'green'}>
                  {selectedCapability.certificationRequired ? 'Required' : 'Not Required'}
                </Tag>
              </div>
            </Card>

            {/* Technical Information (Generic placeholders if not in API data) */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><BulbOutlined /> Technical Information</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-3">
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Structure ID</div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Text copyable>{'99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'}</Text>
                  </div>
                </div>

                <div>
                  <div className="gba:text-sm gba:text-gray-500">Layer</div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <ApartmentOutlined className="gba:text-blue-500" />
                    <div>{'Technical Layer'}</div>
                  </div>
                </div>

                <Divider className="gba:my-3" />

                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Rank in Layer</div>
                    <div className="gba:text-base">
                      <Tag color="blue" icon={<OrderedListOutlined />}>
                        {Math.floor(Math.random() * 10) + 1}
                      </Tag>
                    </div>
                  </div>

                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Group ID</div>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <GroupOutlined className="gba:text-gray-500" />
                      <Text className="gba:text-xs" ellipsis>{selectedCapability.id.substring(0, 8)}</Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Related Applications (Placeholder) */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><FlagOutlined /> Related Applications</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:text-base">Associated Applications</div>
                  <Tag color="processing">{Math.floor(Math.random() * 5)}</Tag>
                </div>
                <div className="gba:text-sm gba:text-gray-500">Applications that require this capability</div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="gba:flex gba:gap-2">
              <Button 
                icon={<EditOutlined />} 
                onClick={() => {
                  handleEdit(selectedCapability);
                  handleCloseDrawer();
                }}
                data-testid={`${prefixDataTestId || ''}-CapabilitiesTab-EditButton`}
              >
                Edit
              </Button>
              <Button 
                icon={<DeleteOutlined />} 
                danger 
                onClick={() => {
                  handleCloseDrawer();
                  handleDelete(selectedCapability);
                }}
                data-testid={`${prefixDataTestId || ''}-CapabilitiesTab-DeleteButton`}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </DataDetailsDrawer>

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