import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography, Tabs } from 'antd';
import { PlusOutlined, DollarOutlined, BuildOutlined, LineChartOutlined, TeamOutlined, BarChartOutlined, PieChartOutlined, RiseOutlined, FundOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useEquityInvestmentIntegration, useEquityChartData } from './hooks';
import { formatCurrency, formatNumber, formatPercentage } from './utils';
import { EquityTimelineCharts, EquityAnalyticsCharts, EquityDistributionCharts } from './components';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface EquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const EquityInvestmentsReport: React.FC<EquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'EquityInvestmentsReport';
  const [activeTab, setActiveTab] = useState('overview');
  
  const { equityInvestments, kpis, isLoading, error, refetch } = useEquityInvestmentIntegration(props);
  const chartData = useEquityChartData(equityInvestments);

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

  const {
    // Original chart data
    roleData,
    valuationEbitdaData,
    ebitdaMarginData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    roiData,
    // Enhanced chart data
    equityTimelineData,
    stakeVsValuationData,
    ebitdaValuationAnalysisData,
    rolePerformanceData,
    concentrationByRoleData,
    topCompaniesByValuationData,
    valuationDistributionData
  } = chartData;

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
            {getTranslationFromI18nKeyAndLabel('equity.investments.title', 'Equity Investments Report')}
          </Title>
          <Tag color="purple">{equityInvestments.length} {getTranslationFromI18nKeyAndLabel('equity.investments.items', 'equity investments')}</Tag>
        </div>
        <Space>
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            type="primary"
            icon={<PlusOutlined />}
          >
            {getTranslationFromI18nKeyAndLabel('button.addEquityInvestment', 'Add Equity Investment')}
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))', 
        gap: '16px',
        marginBottom: '24px',
        maxWidth: '100%'
      }}>
        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalEquityValue')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#722ed1', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <DollarOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalEquityValue', 'Total Equity Value')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalEquityValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageCompanyValuation')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#1890ff', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BuildOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.averageCompanyValuation', 'Average Company Valuation')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.averageCompanyValuation)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalEbitda')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <LineChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalEbitda', 'Total EBITDA')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalEbitda)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-NumberOfEquityInvestments')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#fa8c16', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <TeamOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.numberOfEquityInvestments', 'Number of Equity Investments')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.numberOfEquityInvestments)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Charts */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        data-testid={formatDataTestId(prefixDataTestId, 'ChartTabs')}
        style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px' }}
      >
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              {getTranslationFromI18nKeyAndLabel('tab.overview', 'Overview')}
            </span>
          } 
          key="overview"
        >
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p>Overview content coming soon...</p>
          </div>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <RiseOutlined />
              {getTranslationFromI18nKeyAndLabel('tab.timeline', 'Timeline Analysis')}
            </span>
          } 
          key="timeline"
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '24px',
            maxWidth: '100%'
          }}>
            <EquityTimelineCharts
              equityTimelineData={equityTimelineData}
              topCompaniesByValuationData={topCompaniesByValuationData}
            />
          </div>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <FundOutlined />
              {getTranslationFromI18nKeyAndLabel('tab.analytics', 'Performance Analytics')}
            </span>
          } 
          key="analytics"
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(800px, 100%), 1fr))', 
            gap: '24px',
            maxWidth: '100%'
          }}>
            <EquityAnalyticsCharts
              stakeVsValuationData={stakeVsValuationData}
              ebitdaValuationAnalysisData={ebitdaValuationAnalysisData}
              rolePerformanceData={rolePerformanceData}
              concentrationByRoleData={concentrationByRoleData}
              valuationDistributionData={valuationDistributionData}
            />
          </div>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <PieChartOutlined />
              {getTranslationFromI18nKeyAndLabel('tab.distribution', 'Distribution Analysis')}
            </span>
          } 
          key="distribution"
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(600px, 100%), 1fr))', 
            gap: '24px',
            maxWidth: '100%'
          }}>
            {/* Complete Distribution Charts */}
            <EquityDistributionCharts
              roleData={roleData}
              statusData={statusData}
              phaseData={phaseData}
              riskLevelData={riskLevelData}
              currencyData={currencyData}
              roiData={roiData} // Show all ROI data
              ebitdaMarginData={ebitdaMarginData} // Show all EBITDA data
              valuationEbitdaData={valuationEbitdaData}
            />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default EquityInvestmentsReport; 