import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  Button, 
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
  Divider,
  Input,
  Descriptions,
  Card,
  Statistic,
  Avatar,
  List,
  Select,
  Tabs
} from 'antd';

const { Option } = Select;
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EnvironmentOutlined,
  UserOutlined,
  BankOutlined,
  DownOutlined,
  RightOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  HomeOutlined,
  TeamOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useSiteLocations } from '../../hooks';
import { SiteLocation, Employee, SiteLocationCostCenter } from '../../types';

const { Title, Text } = Typography;

export interface SiteLocationsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const SiteLocationsTab: React.FC<SiteLocationsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const {
    siteLocations,
    isLoading,
    error,
    refetch,
    totalLocations,
    activeLocations,
    totalEmployeeCount,
    totalCount,
    currentPage,
    pageSize,
    changePage
  } = useSiteLocations(context, 10);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SiteLocation | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedSiteLocation, setSelectedSiteLocation] = useState<SiteLocation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  
  // Handle pagination page change
  const handlePageChange = (page: number) => {
    changePage(page);
  };

  // Handle pagination page size change
  const handlePageSizeChange = (currentPage: number, size: number) => {
    changePage(1, size); // Reset to first page when changing page size
  };

  const filteredLocations = siteLocations.filter(location => 
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (location.code && location.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (location.locality && location.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (location.country && location.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (location.address && location.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    message.warning('Add location functionality will be implemented with process API integration');
  };

  const handleEdit = (record: SiteLocation) => {
    message.warning('Edit location functionality will be implemented with process API integration');
  };

  const handleDelete = (record: SiteLocation) => {
    Modal.confirm({
      title: 'Delete Site Location',
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

  const handleExpandRow = (locationId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(locationId)) {
      newExpandedRows.delete(locationId);
    } else {
      newExpandedRows.add(locationId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'green';
      case 'Inactive':
        return 'red';
      default:
        return 'default';
    }
  };

  const renderEmployeeList = (employees: Employee[]) => {
    if (employees.length === 0) {
      return <Empty description="No employees assigned" />;
    }

    return (
      <div className="gba:space-y-2">
        {employees.map((employee) => (
          <div key={employee.id} className="gba:flex gba:items-center gba:space-x-3 gba:p-2 gba:bg-gray-50 gba:rounded">
            <UserOutlined className="gba:text-blue-500" />
            <div className="gba:flex-1">
              <Text strong>{employee.firstName} {employee.lastName}</Text>
              {employee.personnelCode && (
                <Text type="secondary" className="gba:ml-2">({employee.personnelCode})</Text>
              )}
              <div className="gba:text-sm gba:text-gray-600">
                <div>{employee.jobPosition.jobPositionName}</div>
                <div>{employee.organizationalUnit.organizationalUnitName}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCostCenterList = (costCenters: SiteLocationCostCenter[]) => {
    if (costCenters.length === 0) {
      return <Empty description="No cost centers assigned" />;
    }

    return (
      <div className="gba:space-y-2">
        {costCenters.map((costCenter) => (
          <div key={costCenter.id} className="gba:flex gba:items-center gba:space-x-3 gba:p-2 gba:bg-gray-50 gba:rounded">
            <BankOutlined className="gba:text-green-500" />
            <div className="gba:flex-1">
              <Text strong>{costCenter.name}</Text>
              <Text type="secondary" className="gba:ml-2">({costCenter.code})</Text>
              {costCenter.description && (
                <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                  {costCenter.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const columns: ColumnsType<SiteLocation> = [
    {
      title: '',
      key: 'expand',
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={expandedRows.has(record.id) ? <DownOutlined /> : <RightOutlined />}
          onClick={() => handleExpandRow(record.id)}
          data-testid={`${prefixDataTestId}-expand-${record.id}`}
        />
      ),
    },
    {
      title: 'Location',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: SiteLocation) => (
        <div className="gba:flex gba:items-center gba:space-x-3">
          <EnvironmentOutlined className="gba:text-green-500" />
          <div>
            <Text strong className="gba:text-base">{text}</Text>
            {record.code && (
              <Tag color="blue" className="gba:ml-2 gba:text-xs">
                {record.code}
              </Tag>
            )}
            {record.fullAddress && (
              <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                <Tooltip title={record.fullAddress}>
                  <Text ellipsis style={{ maxWidth: 200 }}>
                    {record.fullAddress}
                  </Text>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Location Details',
      key: 'details',
      render: (_, record: SiteLocation) => (
        <div className="gba:space-y-1">
          {record.locality && (
            <div className="gba:text-sm">
              <Text type="secondary">City: </Text>
              <Text>{record.locality}</Text>
            </div>
          )}
          {record.country && (
            <div className="gba:text-sm">
              <Text type="secondary">Country: </Text>
              <Text>{record.country}</Text>
            </div>
          )}
          {record.postalCode && (
            <div className="gba:text-sm">
              <Text type="secondary">Postal Code: </Text>
              <Text>{record.postalCode}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Statistics',
      key: 'statistics',
      render: (_, record: SiteLocation) => (
        <div className="gba:flex gba:flex-col gba:space-y-1">
          <Tag color="blue" icon={<UserOutlined />}>
            {record.employeeCount} employees
          </Tag>
          <Tag color="green" icon={<BankOutlined />}>
            {record.costCenterCount} cost centers
          </Tag>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: SiteLocation) => (
        <Space size="small">
          <Tooltip title="Edit Location">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              data-testid={`${prefixDataTestId}-edit-${record.id}`}
            />
          </Tooltip>
          <Tooltip title="Delete Location">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              data-testid={`${prefixDataTestId}-delete-${record.id}`}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleRowClick = useCallback((record: SiteLocation) => {
    setSelectedSiteLocation(record);
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
    setTimeout(() => {
      setSelectedSiteLocation(null);
    }, 300); // Clear selected location after drawer close animation completes
  }, []);

  const renderEmployeeCountInfo = useCallback((count: number) => {
    if (count === 0) return 'No employees';
    if (count === 1) return '1 employee';
    return `${count} employees`;
  }, []);

  const renderCostCenterCountInfo = useCallback((count: number) => {
    if (count === 0) return 'No cost centers';
    if (count === 1) return '1 cost center';
    return `${count} cost centers`;
  }, []);

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
        message="Error Loading Site Locations"
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
      data-testid={`${prefixDataTestId || ''}-SiteLocationsTab`}
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
            Site Locations
          </Title>
          <Tag color="blue">{totalLocations} locations</Tag>
          <Tag color="green">{activeLocations} active</Tag>
          <Tag color="purple">{totalEmployeeCount} total employees</Tag>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
          data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-AddButton`}
        >
          Add Location
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder={t('hr.search_locations', 'Search locations...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<EnvironmentOutlined />}
          style={{ width: 300 }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-SearchInput`}
        />
      </div>

      {/* Table */}
      <Table
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' }
        })}
        columns={columns}
        dataSource={filteredLocations}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        expandable={{
          expandedRowRender: (record) => (
            <div className="gba:p-4">
              <Tabs defaultActiveKey="employees">
                <Tabs.TabPane 
                  tab={
                    <span>
                      <UserOutlined /> Employees ({record.employeeCount})
                    </span>
                  } 
                  key="employees"
                >
                  {renderEmployeeList(record.employees)}
                </Tabs.TabPane>
                <Tabs.TabPane 
                  tab={
                    <span>
                      <BankOutlined /> Cost Centers ({record.costCenterCount})
                    </span>
                  } 
                  key="costCenters"
                >
                  {renderCostCenterList(record.costCenters)}
                </Tabs.TabPane>
              </Tabs>
            </div>
          ),
          expandIcon: () => null,
          expandRowByClick: false,
          expandedRowKeys: Array.from(expandedRows),
        }}
        data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-table`}
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      />
      
      {/* Custom pagination component */}
      <div className="gba-mt-4 gba-flex gba-justify-between gba-items-center gba-bg-white gba-p-4 gba-rounded-lg gba-shadow-sm">
        <div className="gba-text-gray-600">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
        </div>
        <div className="gba-flex gba-items-center gba-gap-4">
          <div className="gba-flex gba-items-center gba-gap-2">
            <span className="gba-text-gray-600">Show</span>
            <Select
              value={pageSize}
              onChange={(value) => handlePageSizeChange(currentPage, value)}
              data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-PageSizeSelect`}
            >
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
            <span className="gba-text-gray-600">entries</span>
          </div>
          <div>
            <Button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              icon={<LeftOutlined />}
              data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-PrevPageButton`}
            />
            <Button
              type="primary"
              style={{ margin: '0 8px' }}
              disabled={true}
            >
              {currentPage}
            </Button>
            <Button
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => handlePageChange(currentPage + 1)}
              icon={<RightOutlined />}
              data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-NextPageButton`}
            />
          </div>
        </div>
      </div>

      {/* Site Location Details Drawer */}
      <DataDetailsDrawer
        title="Site Location Details"
        icon={<EnvironmentOutlined className="gba:text-green-500" />}
        placement="right"
        onClose={handleCloseDrawer}
        open={drawerVisible}
        width={450}
        dataTestId={`${prefixDataTestId || ''}-SiteLocationsTab-Drawer`}
        className="gba:text-base"
        footer={
          <div className="gba:flex gba:gap-2">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(selectedSiteLocation!)}
              data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-EditButton`}
            >
              Edit
            </Button>
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              onClick={() => {
                handleCloseDrawer();
                handleDelete(selectedSiteLocation!);
              }}
              data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-DeleteButton`}
            >
              Delete
            </Button>
          </div>
        }
      >
        {selectedSiteLocation && (
          <div className="gba:space-y-6">
            {/* Basic Information */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><InfoCircleOutlined /> Basic Information</span>}
              className="gba:shadow-sm"
            >
              <Descriptions column={1} size="small" layout="vertical">
                <Descriptions.Item label="Name">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Text strong className="gba:text-base">{selectedSiteLocation.name || '-'}</Text>
                    {selectedSiteLocation.code && (
                      <Tag color="blue">{selectedSiteLocation.code}</Tag>
                    )}
                  </div>
                </Descriptions.Item>
                
                <Descriptions.Item label="Structure ID">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Text copyable>{selectedSiteLocation.structureId || '-'}</Text>
                  </div>
                </Descriptions.Item>
                
                <Descriptions.Item label="Status">
                  <Tag color={selectedSiteLocation.status === 'Active' ? 'green' : 'red'}>
                    {selectedSiteLocation.status || 'Unknown'}
                  </Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="ID">
                  <Text copyable style={{ fontSize: '12px' }}>
                    {selectedSiteLocation.id || '-'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
            
            {/* Location Address */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><HomeOutlined /> Address</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-3">
                {selectedSiteLocation.address && (
                  <div>
                    <Text type="secondary" className="gba:block gba:text-xs">Street Address:</Text>
                    <Text>{selectedSiteLocation.address}</Text>
                  </div>
                )}
                
                <div className="gba:flex gba:flex-wrap gba:gap-4">
                  {selectedSiteLocation.locality && (
                    <div>
                      <Text type="secondary" className="gba:block gba:text-xs">City/Locality:</Text>
                      <Text>{selectedSiteLocation.locality}</Text>
                    </div>
                  )}
                  
                  {selectedSiteLocation.postalCode && (
                    <div>
                      <Text type="secondary" className="gba:block gba:text-xs">Postal Code:</Text>
                      <Text>{selectedSiteLocation.postalCode}</Text>
                    </div>
                  )}
                </div>
                
                <div className="gba:flex gba:flex-wrap gba:gap-4">
                  {selectedSiteLocation.region && (
                    <div>
                      <Text type="secondary" className="gba:block gba:text-xs">Region:</Text>
                      <Text>{selectedSiteLocation.region}</Text>
                    </div>
                  )}
                  
                  {selectedSiteLocation.country && (
                    <div>
                      <Text type="secondary" className="gba:block gba:text-xs">Country:</Text>
                      <div className="gba:flex gba:items-center gba:space-x-1">
                        <GlobalOutlined className="gba:text-blue-500" />
                        <Text>{selectedSiteLocation.country}</Text>
                      </div>
                    </div>
                  )}
                </div>
                
                {!selectedSiteLocation.address && 
                 !selectedSiteLocation.locality && 
                 !selectedSiteLocation.postalCode && 
                 !selectedSiteLocation.region && 
                 !selectedSiteLocation.country && (
                  <Empty description="No address information available" />
                )}
              </div>
            </Card>
            
            {/* Statistics */}
            <Card 
              title={<span className="gba:flex gba:items-center gba:gap-2"><TeamOutlined /> Statistics</span>}
              className="gba:shadow-sm"
            >
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <Card className="gba:shadow-sm gba:border-blue-100">
                  <Statistic 
                    title="Employees"
                    value={selectedSiteLocation.employeeCount} 
                    prefix={<UserOutlined className="gba:text-blue-500" />}
                    suffix={selectedSiteLocation.employeeCount === 1 ? 'person' : 'people'}
                  />
                </Card>
                
                <Card className="gba:shadow-sm gba:border-green-100">
                  <Statistic 
                    title="Cost Centers"
                    value={selectedSiteLocation.costCenterCount}
                    prefix={<BankOutlined className="gba:text-green-500" />}
                  />
                </Card>
              </div>
            </Card>
            
            {/* Employee Summary */}
            {selectedSiteLocation.employees.length > 0 && (
              <Card 
                title={<span className="gba:flex gba:items-center gba:gap-2">
                  <UserOutlined className="gba:text-blue-500" /> 
                  Employees ({selectedSiteLocation.employeeCount})
                </span>}
                className="gba:shadow-sm"
              >
                <List
                  dataSource={selectedSiteLocation.employees.slice(0, 5)} // Show only first 5 to avoid clutter
                  renderItem={(employee) => (
                    <List.Item className="gba:py-2">
                      <List.Item.Meta
                        avatar={
                          <Avatar icon={<UserOutlined />} className="gba:bg-blue-500" />
                        }
                        title={
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <Text strong>{`${employee.firstName} ${employee.lastName}`}</Text>
                            {employee.personnelCode && (
                              <Tag color="blue" className="gba:text-xs">{employee.personnelCode}</Tag>
                            )}
                          </div>
                        }
                        description={
                          <div className="gba:space-y-1">
                            <div className="gba:text-sm">{employee.jobPosition?.jobPositionName || '-'}</div>
                            <div className="gba:text-xs gba:text-gray-500">{employee.organizationalUnit?.organizationalUnitName || '-'}</div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
                {selectedSiteLocation.employees.length > 5 && (
                  <div className="gba:mt-2 gba:text-center">
                    <Text type="secondary">
                      + {selectedSiteLocation.employees.length - 5} more employees
                    </Text>
                  </div>
                )}
              </Card>
            )}
            
            {/* Cost Center Summary */}
            {selectedSiteLocation.costCenters.length > 0 && (
              <Card 
                title={<span className="gba:flex gba:items-center gba:gap-2">
                  <BankOutlined className="gba:text-green-500" />
                  Cost Centers ({selectedSiteLocation.costCenterCount})
                </span>}
                className="gba:shadow-sm"
              >
                <List
                  dataSource={selectedSiteLocation.costCenters.slice(0, 5)} // Show only first 5
                  renderItem={(costCenter) => (
                    <List.Item className="gba:py-2">
                      <List.Item.Meta
                        avatar={<Avatar icon={<BankOutlined />} className="gba:bg-green-500" />}
                        title={
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <Text strong>{costCenter.name || '-'}</Text>
                            <Tag color="green" className="gba:text-xs">{costCenter.code || '-'}</Tag>
                          </div>
                        }
                        description={
                          costCenter.description || 'No description available'
                        }
                      />
                    </List.Item>
                  )}
                />
                {selectedSiteLocation.costCenters.length > 5 && (
                  <div className="gba:mt-2 gba:text-center">
                    <Text type="secondary">
                      + {selectedSiteLocation.costCenters.length - 5} more cost centers
                    </Text>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export default SiteLocationsTab;
export { SiteLocationsTab }; 