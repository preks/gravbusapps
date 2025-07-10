import React from 'react';
import { Card, Row, Col, Statistic, Alert, Button, Space } from 'antd';
import { 
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  FunnelPlotOutlined,
  LineChartOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { OpportunityStatisticsData } from '../types';

interface OpportunityStatisticsProps {
  statistics: OpportunityStatisticsData;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const OpportunityStatistics: React.FC<OpportunityStatisticsProps> = ({
  statistics,
  isLoading,
  error,
  onRetry
}) => {
  if (error) {
    return (
      <Alert
        message="Error Loading Statistics"
        description={error.message}
        type="error"
        showIcon
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            Retry
          </Button>
        }
        data-testid="opportunity-statistics-error"
      />
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div data-testid="opportunity-statistics-container">
      {/* Main Statistics Cards */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Recent Opportunities"
              value={statistics.recentOpportunities}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              Past 2 weeks
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Total Pipeline Value"
              value={formatCurrency(statistics.totalOpportunityValue)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              All opportunities
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Average Win Rate"
              value={statistics.averageWinRate}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              Winning chance
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="This Year"
              value={statistics.totalOpportunitiesThisYear}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              New opportunities
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12}>
          <Card size="small" loading={isLoading}>
            <Space>
              <FunnelPlotOutlined />
              <div>
                <div className="gba:font-medium">Most Common Stage</div>
                <div className="gba:text-gray-500">
                  {statistics.mostCommonStage}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" loading={isLoading}>
            <Space>
              <LineChartOutlined />
              <div>
                <div className="gba:font-medium">Most Common Pipeline</div>
                <div className="gba:text-gray-500">
                  {statistics.mostCommonPipeline}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OpportunityStatistics; 