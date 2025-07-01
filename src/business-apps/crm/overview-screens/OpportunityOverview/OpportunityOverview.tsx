import { useState, useEffect } from 'react';
import { Row, Col, Tag, Button, Tooltip, message, Modal, Input, Typography, Table, Spin, Empty, Form, InputNumber, Select }from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  DollarOutlined, 
  TrophyOutlined, 
  RiseOutlined, 
  ClockCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType, TableProps } from "antd/es/table";
import { BusinessAppContextProps } from '@/business-apps/types';
import { useOpportunitiesData, OpportunityData } from './hooks';
import OpportunityDetail from '../../detail-screens/OpportunityDetail/OpportunityDetail';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useDebounce } from '@/common/hooks/useDebounce';

const { Title } = Typography;
const { Option } = Select;

interface ReferenceData {
  id: string;
  code: string;
  value: string;
}

export function OpportunityOverview({ accessToken, userInfo }: BusinessAppContextProps) {
  const { 
    opportunities, 
    loading, 
    totalCount, 
    currentPage, 
    pageSize, 
    handlePageChange, 
    handleSearch,
    deleteOpportunity,
    refetch 
  } = useOpportunitiesData(accessToken);
  
  const [isDeletingOpportunity, setIsDeletingOpportunity] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityData | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchText, 200); 

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // New state variables for create opportunity modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [winningChanceValue, setWinningChanceValue] = useState<number | null>(null);
  const [form] = Form.useForm();

  // Check if winning chance is valid (0-100 range)
  const isWinningChanceValid = winningChanceValue === null || (winningChanceValue >= 0 && winningChanceValue <= 100);

  // State for catalog data
  const [salesPipelineOptions, setSalesPipelineOptions] = useState<ReferenceData[]>([]);
  const [salesLeadSourceOptions, setSalesLeadSourceOptions] = useState<ReferenceData[]>([]);
  const [salesOpportunityStatusOptions, setSalesOpportunityStatusOptions] = useState<ReferenceData[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<ReferenceData[]>([]);
  const [isCatalogsLoading, setIsCatalogsLoading] = useState<boolean>(false);

  // Initialize catalog client
  const catalogClient = useCatalogManagerClient(accessToken);

  // Function to handle form values change
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // Track winning chance value
    if ('winningChance' in changedValues) {
      setWinningChanceValue(changedValues.winningChance);
    }
  };

  // Fetch catalog data
  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        setIsCatalogsLoading(true);
        
        // Fetch Sales Pipeline options
        const pipelineResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'SalesPipeline', 
          version: 'v1' 
        });
        
        if (pipelineResponse.data) {
          setSalesPipelineOptions(pipelineResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
        
        // Fetch Sales Lead Source options
        const leadSourceResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'SalesLeadSource', 
          version: 'v1' 
        });
        
        if (leadSourceResponse.data) {
          setSalesLeadSourceOptions(leadSourceResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
        
        // Fetch Sales Opportunity Status options
        const statusResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'SalesOpportunityStatus', 
          version: 'v1' 
        });
        
        if (statusResponse.data) {
          setSalesOpportunityStatusOptions(statusResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
        
        // Fetch Currency options
        const currencyResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'Currency', 
          version: 'v1' 
        });
        
        if (currencyResponse.data) {
          setCurrencyOptions(currencyResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
      } catch (error) {
        console.error('Error fetching catalog data:', error);
        message.error('Failed to load reference data for dropdowns');
      } finally {
        setIsCatalogsLoading(false);
      }
    };
    
    fetchCatalogData();
  }, [accessToken, catalogClient]);

  // Add state to track sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(null);

  // Column definitions for the opportunity table
  const opportunityColumns: ColumnsType<OpportunityData> = [
    {
      title: 'Opportunity',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="gba:opportunity-name-cell" data-testid={`opportunity-name-${record.name}`}>
          <span>{text}</span>
          <span className="gba:opportunity-company">{record.account?.name}</span>
        </div>
      ),
      sortDirections: ['ascend', 'descend'],
      sorter: true,
    },
    {
      title: 'Value',
      dataIndex: 'estimatedAmount',
      key: 'estimatedAmount',
      render: (value, record) => {
        return `${value?.toLocaleString() || 0}${record.currency?.value ? ' ' + record.currency.value : ''}`;
      },
      sortDirections: ['ascend', 'descend'],
      sorter: true,
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (value) => value,
      sortDirections: ['ascend', 'descend'],
      sorter: true,
    },
    {
      title: 'Probability',
      dataIndex: 'winningChance',
      key: 'winningChance',
      render: (probability) => probability ? `${probability}%` : '',
      sortDirections: ['ascend', 'descend'],
      sorter: true,
    },
    {
      title: 'Owner',
      dataIndex: 'ownerEmployee',
      key: 'ownerEmployee',
      render: (name) => name?.displayName,
      sortDirections: ['ascend', 'descend'],
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div className="gba:opportunity-actions" data-testid={`opportunity-actions-${record.name}`}>
          <Tooltip title="Delete">
            <Button 
              icon={<DeleteOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteOpportunity(record.id, record.name);
              }}
              data-testid={`delete-opportunity-${record.name}`}
            />
          </Tooltip>
        </div>
      ),
    },
  ];
  

  const totalValue = 9300000; // €9.3M
  const totalOpportunities = 3;
  const averageValue = totalValue / totalOpportunities;
  const winRate = 60; // 60% average

  const handleOpportunityDetailBack = () => {
    setIsDetailVisible(false);
    setSelectedOpportunity(null);
  };

  async function handleCreateOpportunitySubmit(values: { 
    name: string; 
    estimatedAmount: number; 
    winningChance: number;
    salesPipelineId: string;
    salesLeadSourceId: string;
    salesOpportunityStatusId: string;
    currencyId: string;
  }) {
    setIsSubmitting(true);
    try {
      const savePayload = {
        "id": "string",
        "changeMode": "INSERT",
        "opportunity": {
          "name": values.name,
          "estimatedAmount": values.estimatedAmount,
          "winningChance": values.winningChance,
          "salesPipelineRef": values.salesPipelineId,
          "salesLeadSourceRef": values.salesLeadSourceId,
          "salesOpportunityStatusRef": values.salesOpportunityStatusId,
          "currencyRef": values.currencyId,
          "ownerEmployee": userInfo.employeeDetails.employeeId
        }
      };

      const response = await fetch(
       'https://newwork-dev.newwork.com/processes/customer-relations/saveOpportunity',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        }
      );
      
      const responseText = await response.text();
      if (response.ok) {
        message.success('Opportunity created successfully');
        setIsCreateModalOpen(false);
        form.resetFields();
        setWinningChanceValue(null);
        refetch();
      } else {
        console.error('Error creating opportunity:', responseText);
        message.error(`Failed to create opportunity: ${responseText}`);
          }
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('An unexpected error occurred while creating the opportunity');
    } finally {
      setIsSubmitting(false);
    }
  }
  // Conditional rendering based on whether detail view is active
  if (isDetailVisible && selectedOpportunity) {
    return (
      <div className="gba:opportunity-detail-container" data-testid="opportunity-detail-container" style={{ backgroundColor: 'white', padding: '16px' }}>
        <OpportunityDetail 
          accessToken={accessToken}
          opportunityId={selectedOpportunity.id}
          userInfo={userInfo}
          onBack={handleOpportunityDetailBack}
        />
      </div>
    );
  }

  // Handle table change for sorting
  const handleTableChange: TableProps<OpportunityData>['onChange'] = (pagination, filters, sorter) => {
    if (Array.isArray(sorter)) {
      // If multiple sort columns, use the first one
      sorter = sorter[0];
    }
    
    // Only if there's an active sorter with a field and order
    if (sorter && 'field' in sorter) {
      const field = sorter.field as string;
      const order = sorter.order;
      
      // Update the sort state
      setSortField(field);
      setSortOrder(order);
      
      // Log the detected sorting information
      let orderByCondition = '';
      
      if (order) {
        let backendField = field;
        
        // Flag to determine if we need to append direction later
        let isSpecialField = false;
        
        if (field === 'name') {
          backendField = 'name';
        } else if (field === 'estimatedAmount') {
          backendField = 'estimatedAmount';
        } else if(field==="winningChance"){
          backendField = 'winningChance';
        } else if(field=='stage') {
          backendField = "stage"
        } else if(field=='ownerEmployee'){
          isSpecialField = true;
          // For ownerEmployee, sort by firstName and lastName with the same direction
          const sortDirection = order === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';
          
          // Create the nested structure for the GraphQL query
          const orderByObj = {
            'ownerEmployee': {
              'displayName': sortDirection,
            }
          };
          
          // Convert to JSON string
          backendField = JSON.stringify(orderByObj);
        }
        
        const direction = order === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_FIRST';
        
        // Set the orderByCondition based on whether it's a special field or not
        if (isSpecialField) {
          // For special fields that already have complex JSON
          orderByCondition = backendField;
        } else {
          // Create a simple object with a single field and convert to JSON string
          const orderByObj = {
            [backendField]: direction
          };
          orderByCondition = JSON.stringify(orderByObj);
        }
        
        refetch(orderByCondition);
      } else {
        refetch('');
      }
    }
  };

  return (
    <div className="gba:opportunity-overview-container" data-testid="opportunity-overview-container" style={{ backgroundColor: 'white', padding: '16px' }}>
      <Row justify="space-between" style={{ marginBottom: '24px' }} className="gba:header-row" data-testid="opportunities-header">
        <Col>
          <Typography.Title level={2} style={{ margin: 0 }}>Opportunities</Typography.Title>
          <Typography.Paragraph type="secondary">Manage your sales opportunities pipeline.</Typography.Paragraph>
        </Col>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-opportunity-button"
          >
            Create Opportunity
          </Button>
        </Col>
      </Row>

      {/* KPIs row */}
      <Row gutter={16} style={{ marginBottom: '24px' }} className="gba:kpi-row">
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }} data-testid="kpi-total-value">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarOutlined className="gba:h-5 gba:w-5 gba:text-blue-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Total Value</div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-500">
                  €{(totalValue / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }} data-testid="kpi-active-opportunities">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrophyOutlined className="gba:h-5 gba:w-5 gba:text-green-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Active Opportunities</div>
                <div className="gba:text-2xl gba:font-bold gba:text-green-500">
                  {totalOpportunities}
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }} data-testid="kpi-average-value">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-orange-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiseOutlined className="gba:h-5 gba:w-5 gba:text-orange-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Average Value</div>
                <div className="gba:text-2xl gba:font-bold gba:text-orange-500">
                  €{(averageValue / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }} data-testid="kpi-win-rate">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-purple-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockCircleOutlined className="gba:h-5 gba:w-5 gba:text-purple-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Avg Win Rate</div>
                <div className="gba:text-2xl gba:font-bold gba:text-purple-500">
                  {winRate}%
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Search Section */}
      <div style={{ marginBottom: 16 }} data-testid="opportunities-search">
        <Input
          placeholder="Search opportunities..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
          data-testid="opportunity-search-input"
        />
      </div>

      <Spin spinning={loading}>
        <Table 
          columns={opportunityColumns} 
          dataSource={opportunities} 
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handlePageChange,
            className: 'gba:custom-pagination',
          }}
          className="gba:opportunity-table"
          style={{ 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            padding: '24px'
          }}
          locale={{
            emptyText: 
              !loading && opportunities.length === 0 ? 
              <Empty description="No opportunities found." /> : 
              <span>No data</span> 
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => {
              handleViewOpportunity(record);
            },
            style: { cursor: 'pointer' }
          })}
        />
      </Spin>
      <Modal
        title="Create New Opportunity"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
          setWinningChanceValue(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsCreateModalOpen(false);
              form.resetFields();
              setWinningChanceValue(null);
            }}
            data-testid="cancel-create-opportunity"
          >
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={isSubmitting}
            onClick={() => form.submit()}
            disabled={!isWinningChanceValid}
            data-testid="submit-create-opportunity"
          >
            Create
          </Button>
        ]}
        maskClosable={false}
        destroyOnClose={true}
        className="gba:create-opportunity-modal"
        data-testid="create-opportunity-modal"
      >
        <Spin spinning={isCatalogsLoading} tip="Loading catalog data...">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateOpportunitySubmit}
            onValuesChange={handleFormValuesChange}
            className="gba:create-opportunity-form"
            data-testid="create-opportunity-form"
          >
            <Form.Item
              name="name"
              label="Opportunity Name"
              rules={[
                { required: true, message: 'Please enter a name for the opportunity' }
              ]}
              data-testid="opportunity-name-field"
            >
              <Input placeholder="Enter opportunity name" data-testid="opportunity-name-input" />
            </Form.Item>

            <Form.Item
              name="salesPipelineId"
              label="Sales Pipeline"
              rules={[
                { required: true, message: 'Please select a sales pipeline' }
              ]}
              data-testid="opportunity-pipeline-field"
            >
              <Select 
                placeholder="Select sales pipeline" 
                data-testid="opportunity-pipeline-select"
                loading={isCatalogsLoading}
              >
                {salesPipelineOptions.map(option => (
                  <Option key={option.id} value={option.id}>{option.value}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="salesLeadSourceId"
              label="Lead Source"
              rules={[
                { required: true, message: 'Please select a lead source' }
              ]}
              data-testid="opportunity-lead-source-field"
            >
              <Select 
                placeholder="Select lead source" 
                data-testid="opportunity-lead-source-select"
                loading={isCatalogsLoading}
              >
                {salesLeadSourceOptions.map(option => (
                  <Option key={option.id} value={option.id}>{option.value}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="salesOpportunityStatusId"
              label="Status"
              rules={[
                { required: true, message: 'Please select a status' }
              ]}
              data-testid="opportunity-status-field"
            >
              <Select 
                placeholder="Select status" 
                data-testid="opportunity-status-select"
                loading={isCatalogsLoading}
              >
                {salesOpportunityStatusOptions.map(option => (
                  <Option key={option.id} value={option.id}>{option.value}</Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="estimatedAmount"
                  label="Estimated Amount"
                  rules={[
                    { required: true, message: 'Please enter the estimated amount' },
                    { type: 'number', message: 'Please enter a valid number' }
                  ]}
                  data-testid="opportunity-amount-field"
                >
                  <InputNumber 
                    placeholder="Enter amount" 
                    style={{ width: '100%' }} 
                    min={0} 
                    step={1000}
                    type="number"
                    inputMode="numeric"
                    data-testid="opportunity-amount-input"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="currencyId"
                  label="Currency"
                  rules={[
                    { required: true, message: 'Please select a currency' }
                  ]}
                  data-testid="opportunity-currency-field"
                >
                  <Select 
                    placeholder="Select currency" 
                    data-testid="opportunity-currency-select"
                    loading={isCatalogsLoading}
                  >
                    {currencyOptions.map(option => (
                      <Option key={option.id} value={option.id}>{option.value}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="winningChance"
              label="Winning Chance (%)"
              rules={[
                { required: true, message: 'Please enter the winning chance' },
                { type: 'number', min: 0, max: 100, message: 'Winning chance must be between 0 and 100' }
              ]}
              data-testid="opportunity-winning-chance-field"
            >
              <InputNumber 
                placeholder="Enter winning chance" 
                style={{ width: '100%' }} 
                min={0}
                max={100}
                type="number"
                inputMode="numeric"
                precision={0}
                onChange={(value) => setWinningChanceValue(value)} 
                data-testid="opportunity-winning-chance-input"
              />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

    </div>
  );

  // Function to handle creating a new opportunity
  function handleCreateOpportunity() {
    message.info('Create Opportunity functionality will be available soon!');
    // Note: In a real implementation, this would navigate to a create opportunity form
    // or open a modal with the opportunity creation form
  }
  
  // Function to handle viewing opportunity details
  function handleViewOpportunity(opportunity: OpportunityData) {
    if (opportunity && opportunity.id) {
      // Force a re-render by creating a new object
      setSelectedOpportunity({...opportunity});
      setIsDetailVisible(true);
    } else {
      message.error('Cannot view opportunity: ID is missing');
    }
  }

  // Function to handle opportunity deletion with confirmation
  function handleDeleteOpportunity(id: string, name: string) {
    Modal.confirm({
      title: 'Delete Opportunity',
      content: `Are you sure you want to delete the opportunity "${name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      okButtonProps: { loading: isDeletingOpportunity },
      onOk: async () => {
        setIsDeletingOpportunity(true);
        try {
          const result = await deleteOpportunity(id);
          if (result.success) {
            message.success('Opportunity deleted successfully');
          } else {
            message.error(`Failed to delete opportunity: ${result.error}`);
          }
        } catch (error) {
          console.error('Error in delete handler:', error);
          message.error('An unexpected error occurred while deleting the opportunity');
        } finally {
          setIsDeletingOpportunity(false);
        }
      },
      maskClosable: true
    });
  }
}

export default OpportunityOverview;
