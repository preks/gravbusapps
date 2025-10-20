import React, { useState, useEffect } from 'react'
import { Tabs, Card, Spin, Alert, Button, Typography, Space, Tag } from 'antd'
import {
  BarChartOutlined,
  ApartmentOutlined,
  TeamOutlined,
  DashboardOutlined,
  ReloadOutlined,
  NodeExpandOutlined
} from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useStructuralAnalysisDataIntegration } from '../../../hooks/useStructuralAnalysisDataIntegration'
import { SunburstVisualization } from './components/SunburstVisualization'
import { SpanOfControlChart } from './components/SpanOfControlChart'
import { ReportingChainAnalysis } from './components/ReportingChainAnalysis'
import { AnalysisTab } from './types/structuralTypes'
import OrganizationalHierarchyReport from './components/organizational-hierarchy-report/OrgHierarchyReport'

const { Title, Text } = Typography

interface StructuralAnalysisReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const StructuralAnalysisReport: React.FC<StructuralAnalysisReportProps> = props => {
  const { prefixDataTestId = 'StructuralAnalysisReport' } = props

  // Define valid tabs
  const validTabs: AnalysisTab[] = [
    'overview',
    'span-control',
    'depth-analysis',
    'reporting-chains',
    'organizational-hierarchy'
  ]
  const defaultTab: AnalysisTab = 'overview'

  // Get content from URL query parameter or use default
  const getInitialTab = (): AnalysisTab => {
    const urlParams = new URLSearchParams(window.location.search)
    const contentFromUrl = urlParams.get('content') as AnalysisTab

    if (validTabs.includes(contentFromUrl)) {
      return contentFromUrl
    } else {
      // No valid content in URL, set default content in URL
      const url = new URL(window.location.href)
      url.searchParams.set('content', defaultTab)
      window.history.replaceState({}, '', url.toString())
      return defaultTab
    }
  }

  const [activeTab, setActiveTab] = useState<AnalysisTab>(getInitialTab)

  const { data, isLoading, error, refetch } = useStructuralAnalysisDataIntegration(props)

  // Update URL when content changes
  const handleTabChange = (key: string) => {
    const newTab = key as AnalysisTab
    setActiveTab(newTab)
    const url = new URL(window.location.href)
    url.searchParams.set('content', newTab)
    window.history.pushState({}, '', url.toString())
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const contentFromUrl = urlParams.get('content') as AnalysisTab
      const newTab = validTabs.includes(contentFromUrl) ? contentFromUrl : defaultTab
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-Loading`}
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px] gba:bg-gradient-to-b gba:from-background gba:to-muted gba:rounded-lg"
      >
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text>Loading structural analysis data...</Text>
        </Space>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-Error`}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-[400px] gba:p-6 gba:rounded-lg"
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
    )
  }

  // Show no data state
  if (!data) {
    return (
      <div
        data-testid={`${prefixDataTestId}-NoData`}
        className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-[400px] gba:p-6 gba:rounded-lg"
      >
        <Alert
          message="No Data Available"
          description="No structural analysis data found for the current structure."
          type="info"
          showIcon
        />
      </div>
    )
  }

  // Overview Tab Content
  const renderOverviewTab = () => (
    <div className="gba:grid gba:gap-6">
      {/* Key Statistics */}
      <Card>
        <Title level={4} className="gba:m-0 gba:mb-6 gba:text-foreground">
          Structural Health Overview
        </Title>
        <div className="gba:grid gba:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gba:gap-5">
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.structuralHealthScore}%
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Structural Health Score</div>
            <Tag
              color={
                data.structuralStatistics.structuralHealthScore >= 80
                  ? 'green'
                  : data.structuralStatistics.structuralHealthScore >= 60
                    ? 'orange'
                    : 'red'
              }
              style={{ marginTop: '8px' }}
            >
              {data.structuralStatistics.structuralHealthScore >= 80
                ? 'Excellent'
                : data.structuralStatistics.structuralHealthScore >= 60
                  ? 'Good'
                  : 'Needs Improvement'}
            </Tag>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.totalEmployees}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Total Employees</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.totalManagers}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Total Managers</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.hierarchyDepth}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Hierarchy Depth</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.averageSpanOfControl.toFixed(1)}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Avg. Span of Control</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.averageReportingChainLength.toFixed(1)}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Avg. Chain Length</div>
          </div>
        </div>
      </Card>

      {/* Quick Insights */}
      <Card>
        <Title level={4} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Key Insights
        </Title>
        <div className="gba:grid gba:gap-3">
          <div className="gba:p-3 gba:bg-success-secondary/40 gba:rounded gba:border-l-4 gba:border-l-success">
            <Text strong className="gba:text-success-secondary-foreground">
              Span of Control: {data.spanOfControlSummary.optimalCount} of {data.spanOfControlSummary.totalManagers}{' '}
              managers have optimal span
            </Text>
          </div>
          {data.spanOfControlSummary.overBurdenedCount > 0 && (
            <div className="gba:p-3 gba:bg-destructive-secondary/40 gba:rounded gba:border-l-4 gba:border-l-destructive">
              <Text strong className="gba:text-destructive-secondary-foreground">
                Alert: {data.spanOfControlSummary.overBurdenedCount} managers are over-burdened
              </Text>
            </div>
          )}
          <div className="gba:p-3 gba:bg-info-secondary/40 gba:rounded gba:border-l-4 gba:border-l-info">
            <Text strong className="gba:text-info-secondary-foreground">
              Organizational Depth: Maximum hierarchy depth is {data.structuralStatistics.hierarchyDepth} levels
            </Text>
          </div>
          {data.reportingChainSummary.bottlenecks.length > 0 && (
            <div className="gba:p-3 gba:bg-warning-secondary gba:rounded gba:border-l-4 gba:border-l-warning">
              <Text strong className="gba:text-warning-secondary-foreground">
                Warning: {data.reportingChainSummary.bottlenecks.length} management bottlenecks identified
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  )

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
      children: <SunburstVisualization data={data.sunburstData} prefixDataTestId={prefixDataTestId} />
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
      children: <OrganizationalHierarchyReport {...props} />
    }
  ]

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <Title level={3} className="gba:m-0 gba:text-foreground">
            Structural Analysis Reports
          </Title>
          <Text className="gba:text-muted-foreground">
            Comprehensive analysis of organizational structure, span of control, and reporting efficiency
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={refetch} type="primary" ghost>
          Refresh Data
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        className="gba:bg-primary-foreground gba:rounded-lg gba:px-6"
      />
    </div>
  )
}

// Default export for Business App IDE
export default StructuralAnalysisReport
