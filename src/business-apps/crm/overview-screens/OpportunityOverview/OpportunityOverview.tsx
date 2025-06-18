import { Row, Col, Tag, Button, Tooltip } from 'antd';
import { PlusOutlined, DollarOutlined, TrophyOutlined, ClockCircleOutlined, RiseOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { CrmDataTable } from '../../components/tables';
import type { ColumnsType } from "antd/es/table";
import "./styles/OpportunityOverview.css";
import { PageHeader } from '../../components/layout/PageHeader';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useOpportunitiesData, OpportunityData } from './hooks';

export function OpportunityOverview({ accessToken }: BusinessAppContextProps) {
  const { 
    opportunities, 
    loading, 
    totalCount, 
    currentPage, 
    pageSize, 
    handlePageChange, 
    handleSearch 
  } = useOpportunitiesData(accessToken);

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
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Value',
      dataIndex: 'estimatedAmount',
      key: 'estimatedAmount',
      render: (value, record) => `${record.currency?.value} ${value?.toLocaleString() || 0}`,
      sorter: (a, b) => (a.estimatedAmount || 0) - (b.estimatedAmount || 0),
    },
    {
      title: 'Pipeline',
      dataIndex: ['salesPipeline', 'value'],
      key: 'salesPipeline',
      render: (value) => value,
      sorter: (a, b) => (a.salesPipeline?.value || '').localeCompare(b.salesPipeline?.value || ''),
    },
    {
      title: 'Stage',
      dataIndex: ['salesPipelineStage', 'value'],
      key: 'salesPipelineStage',
      render: (stage) => {
        let color = 'default';
        if (stage?.toLowerCase().includes('qualified')) color = 'blue';
        if (stage?.toLowerCase().includes('discovery')) color = 'cyan';
        if (stage?.toLowerCase().includes('proposal')) color = 'orange';
        if (stage?.toLowerCase().includes('negotiation')) color = 'gold';
        if (stage?.toLowerCase().includes('won')) color = 'green';
        if (stage?.toLowerCase().includes('lost')) color = 'red';

        return <Tag color={color} data-testid={`opportunity-stage-${stage}`}>{stage}</Tag>;
      },
    },
    {
      title: 'Probability',
      dataIndex: 'winningChance',
      key: 'winningChance',
      render: (probability) => `${probability}%`,
      sorter: (a, b) => (a.winningChance || 0) - (b.winningChance || 0),
    },
    {
      title: 'Owner',
      dataIndex: ['ownerEmployee', 'displayName'],
      key: 'owner',
      render: (name) => name,
      sorter: (a, b) => (a.ownerEmployee?.displayName || '').localeCompare(b.ownerEmployee?.displayName || ''),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div className="gba:opportunity-actions" data-testid={`opportunity-actions-${record.name}`}>
          <Tooltip title="View">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                console.log(`View opportunity: ${record.name}`);
              }}
              data-testid={`view-opportunity-${record.name}`}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                console.log(`Edit opportunity: ${record.name}`);
              }}
              data-testid={`edit-opportunity-${record.name}`}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              icon={<DeleteOutlined />} 
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                console.log(`Delete opportunity: ${record.name}`);
              }}
              data-testid={`delete-opportunity-${record.name}`}
            />
          </Tooltip>
        </div>
      ),
    },
  ];
  
  const handleCreateOpportunity = () => {
    // Will be implemented later with a proper modal
    console.log('Create opportunity clicked');
  };

  // Sample data for KPIs - in real implementation this would come from GraphQL
  const totalValue = 9300000; // €9.3M
  const totalOpportunities = 3;
  const averageValue = totalValue / totalOpportunities;
  const winRate = 60; // 60% average

  return (
    <div style={{ padding: '24px' }} className="gba:opportunity-overview-container">
      <PageHeader
        title="Opportunities"
        primaryAction={{
          label: "Create Opportunity",
          icon: <PlusOutlined />,
          onClick: handleCreateOpportunity,
          testId: "create-opportunity-button"
        }}
        data-testid="opportunities-header"
      />

      <Row gutter={16} style={{ marginBottom: '24px' }} className="gba:kpi-row">
        <Col span={6}>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <DollarOutlined className="gba:h-5 gba:w-5 gba:text-blue-500" />
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
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <TrophyOutlined className="gba:h-5 gba:w-5 gba:text-green-500" />
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
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-orange-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <RiseOutlined className="gba:h-5 gba:w-5 gba:text-orange-500" />
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
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-purple-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <ClockCircleOutlined className="gba:h-5 gba:w-5 gba:text-purple-500" />
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

      <CrmDataTable 
        accessToken={accessToken}
        data={opportunities}
        columns={opportunityColumns}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        searchPlaceholder="Search opportunities..."
        title="Opportunities"
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onRowClick={(record) => console.log(`Clicked on opportunity: ${record.name}`)}
        extraActions={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateOpportunity}
            data-testid="create-opportunity-button"
          >
            New Opportunity
          </Button>
        }
      />
    </div>
  );
}

export default OpportunityOverview;
