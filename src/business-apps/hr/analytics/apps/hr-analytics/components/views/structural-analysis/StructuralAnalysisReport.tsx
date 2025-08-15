import React, { useState, useEffect } from 'react';
import { Tabs, Card, Spin, Alert, Button, Typography, Space, Tag } from 'antd';
import { 
  BarChartOutlined, 
  ApartmentOutlined, 
  TeamOutlined, 
  DashboardOutlined,
  ReloadOutlined,
  NodeExpandOutlined 
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useStructuralAnalysisDataIntegration } from '../../../hooks/useStructuralAnalysisDataIntegration';
import { SunburstVisualization } from './components/SunburstVisualization';
import { SpanOfControlChart } from './components/SpanOfControlChart';
import { ReportingChainAnalysis } from './components/ReportingChainAnalysis';
import { AnalysisTab } from './types/structuralTypes';
import OrganizationalHierarchyReport from './components/organizational-hierarchy-report/OrganizationalHierarchyReport';

const { Title, Text } = Typography;

interface StructuralAnalysisReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const StructuralAnalysisReport: React.FC<StructuralAnalysisReportProps> = (props) => {
  const { prefixDataTestId = 'StructuralAnalysisReport' } = props;
  
  // Define valid tabs
  const validTabs: AnalysisTab[] = ['overview', 'span-control', 'depth-analysis', 'reporting-chains', 'organizational-hierarchy'];
  const defaultTab: AnalysisTab = 'overview';

  // Get tab from URL query parameter or use default
  const getInitialTab = (): AnalysisTab => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') as AnalysisTab;
    
    if (validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    } else {
      // No valid tab in URL, set default tab in URL
      const url = new URL(window.location.href);
      url.searchParams.set('tab', defaultTab);
      window.history.replaceState({}, '', url.toString());
      return defaultTab;
    }
  };

  const [activeTab, setActiveTab] = useState<AnalysisTab>(getInitialTab);

  const { data, isLoading, error, refetch } = useStructuralAnalysisDataIntegration(props);

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    const newTab = key as AnalysisTab;
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url.toString());
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab') as AnalysisTab;
      const newTab = validTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab;
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-Loading`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          borderRadius: '8px'
        }}
      >
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text>Loading structural analysis data...</Text>
        </Space>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-Error`}
        style={{
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '400px',
          padding: '24px',
          borderRadius: '8px'
        }}
      >
        <Alert
          message="Error Loading Structural Analysis Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={refetch}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // Show no data state
  if (!data) {
    return (
      <div
        data-testid={`${prefixDataTestId}-NoData`}
        style={{
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '400px',
          padding: '24px',
          borderRadius: '8px'
        }}
      >
        <Alert
          message="No Data Available"
          description="No structural analysis data found for the current structure."
          type="info"
          showIcon
        />
      </div>
    );
  }

  // Overview Tab Content
  const renderOverviewTab = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Key Statistics */}
      <Card>
        <Title level={4} style={{ margin: 0, marginBottom: '24px', color: '#1f2937' }}>
          Structural Health Overview
        </Title>
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {data.structuralStatistics.structuralHealthScore}%
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Structural Health Score
            </div>
            <Tag 
              color={data.structuralStatistics.structuralHealthScore >= 80 ? 'green' : 
                    data.structuralStatistics.structuralHealthScore >= 60 ? 'orange' : 'red'}
              style={{ marginTop: '8px' }}
            >
              {data.structuralStatistics.structuralHealthScore >= 80 ? 'Excellent' : 
               data.structuralStatistics.structuralHealthScore >= 60 ? 'Good' : 'Needs Improvement'}
            </Tag>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {data.structuralStatistics.totalEmployees}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Total Employees</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {data.structuralStatistics.totalManagers}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Total Managers</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {data.structuralStatistics.hierarchyDepth}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Hierarchy Depth</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {data.structuralStatistics.averageSpanOfControl.toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Avg. Span of Control</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {data.structuralStatistics.averageReportingChainLength.toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Avg. Chain Length</div>
          </div>
        </div>
      </Card>

      {/* Quick Insights */}
      <Card>
        <Title level={4} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
          Key Insights
        </Title>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '6px', borderLeft: '4px solid #4caf50' }}>
            <Text strong style={{ color: '#2e7d32' }}>
              Span of Control: {data.spanOfControlSummary.optimalCount} of {data.spanOfControlSummary.totalManagers} managers have optimal span
            </Text>
          </div>
          {data.spanOfControlSummary.overBurdenedCount > 0 && (
            <div style={{ padding: '12px', backgroundColor: '#f8d7da', borderRadius: '6px', borderLeft: '4px solid #f44336' }}>
              <Text strong style={{ color: '#c62828' }}>
                Alert: {data.spanOfControlSummary.overBurdenedCount} managers are over-burdened
              </Text>
            </div>
          )}
          <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px', borderLeft: '4px solid #2196f3' }}>
            <Text strong style={{ color: '#1565c0' }}>
              Organizational Depth: Maximum hierarchy depth is {data.structuralStatistics.hierarchyDepth} levels
            </Text>
          </div>
          {data.reportingChainSummary.bottlenecks.length > 0 && (
            <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', borderLeft: '4px solid #ff9800' }}>
              <Text strong style={{ color: '#f57c00' }}>
                Warning: {data.reportingChainSummary.bottlenecks.length} management bottlenecks identified
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  // Tab configuration
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined />
          Overview
        </span>
      ),
      children: renderOverviewTab()
    },
    {
      key: 'span-control',
      label: (
        <span>
          <BarChartOutlined />
          Span of Control
        </span>
      ),
      children: (
        <SpanOfControlChart 
          data={data.spanOfControlData}
          summary={data.spanOfControlSummary}
          prefixDataTestId={prefixDataTestId}
        />
      )
    },
    {
      key: 'depth-analysis',
      label: (
        <span>
          <ApartmentOutlined />
          Depth Analysis
        </span>
      ),
      children: (
        <SunburstVisualization 
          data={data.sunburstData}
          prefixDataTestId={prefixDataTestId}
        />
      )
    },
    {
      key: 'reporting-chains',
      label: (
        <span>
          <TeamOutlined />
          Reporting Chains
        </span>
      ),
      children: (
        <ReportingChainAnalysis 
          chains={data.reportingChainData}
          summary={data.reportingChainSummary}
          prefixDataTestId={prefixDataTestId}
        />
      )
    },
    {
      key: 'organizational-hierarchy',
      label: (
        <span>
          <NodeExpandOutlined />
          Organizational Hierarchy
        </span>
      ),
      children: (
        <OrganizationalHierarchyReport 
          {...props}
        />
      )
    }
  ];

  return (
    <div
      data-testid={prefixDataTestId}
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
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            Structural Analysis Reports
          </Title>
          <Text style={{ color: '#666' }}>
            Comprehensive analysis of organizational structure, span of control, and reporting efficiency
          </Text>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={refetch}
          type="primary"
          ghost
        >
          Refresh Data
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        style={{ 
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '0 24px'
        }}
      />
    </div>
  );
};

// Default export for Business App IDE
export default StructuralAnalysisReport; 