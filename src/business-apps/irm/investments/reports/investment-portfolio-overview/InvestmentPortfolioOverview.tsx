import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography, Tabs } from 'antd';
import { PlusOutlined, ReloadOutlined, PieChartOutlined, FundOutlined, BarChartOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentPortfolioIntegration, usePortfolioChartData } from './hooks';
import { formatCurrency, formatNumber, formatPercentage } from './utils';
import { PortfolioTimelineCharts } from './components/PortfolioTimelineCharts';
import { PortfolioAnalyticsCharts } from './components/PortfolioAnalyticsCharts';
import { PortfolioDistributionCharts } from './components/PortfolioDistributionCharts';

const { Title, Text } = Typography;

interface InvestmentPortfolioOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const InvestmentPortfolioOverview: React.FC<InvestmentPortfolioOverviewProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'InvestmentPortfolioOverview';
  const [activeTab, setActiveTab] = useState('overview');
  
  const { investments, kpis, isLoading, error, refetch } = useInvestmentPortfolioIntegration(props);
  const chartData = usePortfolioChartData(investments);

  if (isLoading) {
    return (
      <div
        data-testid={formatDataTestId(prefixDataTestId, 'Loading')}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        data-testid={formatDataTestId(prefixDataTestId, 'Error')}
        message={getTranslationFromI18nKeyAndLabel('error.loading', 'Error Loading Data')}
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
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
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            {getTranslationFromI18nKeyAndLabel('investment.portfolio.title', 'Investment Portfolio Overview')}
          </Title>
          <Tag color="blue">{investments.length} {getTranslationFromI18nKeyAndLabel('investment.portfolio.items', 'investments')}</Tag>
        </div>
        <Space>
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'RefreshButton')}
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            {getTranslationFromI18nKeyAndLabel('button.refresh', 'Refresh')}
          </Button>
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            type="primary"
            icon={<PlusOutlined />}
          >
            {getTranslationFromI18nKeyAndLabel('button.addInvestment', 'Add Investment')}
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalPortfolioValue')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#1890ff', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <PieChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalPortfolioValue', 'Total Portfolio Value')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalPortfolioValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalInvestments')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <FundOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalInvestments', 'Total Investments')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.totalInvestments)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageROI')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#fa8c16', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BarChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.averageROI', 'Average ROI')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatPercentage(kpis.averageROI)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-ActiveInvestments')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#722ed1', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <RiseOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.activeInvestments', 'Active Investments')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.activeInvestments)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Charts */}
      <Card style={{ borderRadius: '8px', background: 'white' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <BarChartOutlined />
                  {getTranslationFromI18nKeyAndLabel('tab.overview', 'Overview')}
                </span>
              ),
              children: (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ textAlign: 'center', color: '#666', fontSize: '16px' }}>
                    {getTranslationFromI18nKeyAndLabel('overview.coming.soon', 'Overview content coming soon...')}
                  </div>
                </div>
              )
            },
            {
              key: 'timeline',
              label: (
                <span>
                  <RiseOutlined />
                  {getTranslationFromI18nKeyAndLabel('tab.timeline.analysis', 'Timeline Analysis')}
                </span>
              ),
              children: (
                <div style={{ padding: '16px 0' }}>
                  <PortfolioTimelineCharts
                    performanceTimelineData={chartData.performanceTimelineData}
                    valueOverTimeData={chartData.valueOverTimeData}
                  />
                </div>
              )
            },
            {
              key: 'analytics',
              label: (
                <span>
                  <FundOutlined />
                  {getTranslationFromI18nKeyAndLabel('tab.performance.analytics', 'Performance Analytics')}
                </span>
              ),
              children: (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    <PortfolioAnalyticsCharts
                      sizeVsRoiData={chartData.sizeVsRoiData}
                      leverageAnalysisData={chartData.leverageAnalysisData}
                      riskReturnData={chartData.riskReturnData}
                      concentrationByGroupData={chartData.concentrationByGroupData}
                      valueByAccountData={chartData.valueByAccountData}
                    />
                  </div>
                </div>
              )
            },
            {
              key: 'distribution',
              label: (
                <span>
                  <PieChartOutlined />
                  {getTranslationFromI18nKeyAndLabel('tab.distribution.analysis', 'Distribution Analysis')}
                </span>
              ),
              children: (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    <PortfolioDistributionCharts
                      investmentTypeData={chartData.investmentTypeData}
                      investmentGroupData={chartData.investmentGroupData}
                      statusData={chartData.statusData}
                      phaseData={chartData.phaseData}
                      riskLevelData={chartData.riskLevelData}
                      currencyData={chartData.currencyData}
                      roiData={chartData.roiData}
                      roiDistributionData={chartData.roiDistributionData}
                    />
                  </div>
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default InvestmentPortfolioOverview; 