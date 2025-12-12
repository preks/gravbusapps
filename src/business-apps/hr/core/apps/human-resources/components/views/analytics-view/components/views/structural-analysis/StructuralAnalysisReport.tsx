import React, { useState, useEffect } from 'react'
import { Tabs, Card, Spin, Alert, Button, Typography, Space } from 'antd'
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
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface StructuralAnalysisReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const StructuralAnalysisReport: React.FC<StructuralAnalysisReportProps> = props => {
  const { prefixDataTestId = 'StructuralAnalysisReport' } = props
  const { t } = useTranslation(hrTranslations)

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
          <Text>{t('hr-analytics-structural-loading')}</Text>
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
          message={t('hr-analytics-structural-error-title')}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={refetch}>
              {t('common-retry')}
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
          message={t('hr-analytics-no-data-available')}
          description={t('hr-analytics-structural-no-data-description')}
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
          {t('hr-analytics-structural-health-overview')}
        </Title>
        <div className="gba:grid gba:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gba:gap-5">
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.totalEmployees}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('hr-analytics-total-employees')}</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.totalManagers}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('hr-analytics-total-managers')}</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.hierarchyDepth}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('hr-analytics-hierarchy-depth')}</div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.averageSpanOfControl.toFixed(1)}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {t('hr-analytics-avg-span-of-control')}
            </div>
          </div>
          <div className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">
              {data.structuralStatistics.averageReportingChainLength.toFixed(1)}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('hr-analytics-avg-chain-length')}</div>
          </div>
        </div>
      </Card>

      {/* Quick Insights */}
      <Card>
        <Title level={4} className="gba:m-0 gba:mb-4 gba:text-foreground">
          {t('hr-analytics-key-insights')}
        </Title>
        <div className="gba:grid gba:gap-3">
          <div className="gba:p-3 gba:bg-success-secondary/40 gba:rounded gba:border-l-4 gba:border-l-success">
            <Text strong className="gba:text-success-secondary-foreground">
              {t('hr-analytics-span-of-control-label')}: {data.spanOfControlSummary.optimalCount} {t('hr-analytics-of')}{' '}
              {data.spanOfControlSummary.totalManagers} {t('hr-analytics-managers-have-optimal-span')}
            </Text>
          </div>
          {data.spanOfControlSummary.overBurdenedCount > 0 && (
            <div className="gba:p-3 gba:bg-destructive-secondary/40 gba:rounded gba:border-l-4 gba:border-l-destructive">
              <Text strong className="gba:text-destructive-secondary-foreground">
                {t('hr-analytics-alert')}: {data.spanOfControlSummary.overBurdenedCount}{' '}
                {t('hr-analytics-managers-overburdened')}
              </Text>
            </div>
          )}
          <div className="gba:p-3 gba:bg-info-secondary/40 gba:rounded gba:border-l-4 gba:border-l-info">
            <Text strong className="gba:text-info-secondary-foreground">
              {t('hr-analytics-organizational-depth-label')}: {t('hr-analytics-maximum-hierarchy-depth-is')}{' '}
              {data.structuralStatistics.hierarchyDepth} {t('hr-analytics-levels')}
            </Text>
          </div>
          {data.reportingChainSummary.bottlenecks.length > 0 && (
            <div className="gba:p-3 gba:bg-warning-secondary gba:rounded gba:border-l-4 gba:border-l-warning">
              <Text strong className="gba:text-warning-secondary-foreground">
                {t('hr-analytics-warning')}: {data.reportingChainSummary.bottlenecks.length}{' '}
                {t('hr-analytics-management-bottlenecks-identified')}
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
          {t('hr-analytics-overview-tab')}
        </span>
      ),
      children: renderOverviewTab()
    },
    {
      key: 'span-control',
      label: (
        <span>
          <BarChartOutlined />
          {t('hr-analytics-span-of-control')}
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
          {t('hr-analytics-depth-analysis')}
        </span>
      ),
      children: <SunburstVisualization data={data.sunburstData} prefixDataTestId={prefixDataTestId} />
    },
    {
      key: 'reporting-chains',
      label: (
        <span>
          <TeamOutlined />
          {t('hr-analytics-reporting-chains')}
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
          {t('hr-analytics-organizational-hierarchy')}
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
            {t('hr-analytics-structural-analysis-reports')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-structural-analysis-description')}</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={refetch} type="primary" ghost>
          {t('common-refresh-data')}
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
