import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useStructuralAnalysisDataIntegration } from '../../../hooks/useStructuralAnalysisDataIntegration'
import { SunburstVisualization } from './components/SunburstVisualization'
import { SpanOfControlChart } from './components/SpanOfControlChart'
import { ReportingChainAnalysis } from './components/ReportingChainAnalysis'
import { AnalysisTab } from './types/structuralTypes'

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation,
  Icon,
  Spinner,
  Card,
  CardContent,
  Button
} from '@newwork/nw-design-system'
import { ChartPieIcon, ChartBarIcon, BuildingsIcon, UsersIcon } from '@phosphor-icons/react'
import { PiArrowClockwise } from 'react-icons/pi'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface StructuralAnalysisReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const StructuralAnalysisReport: React.FC<StructuralAnalysisReportProps> = props => {
  const { prefixDataTestId = 'StructuralAnalysisReport' } = props
  const { t } = useTranslation(hrTranslations)

  // Define valid tabs
  const validTabs = new Set<AnalysisTab>(['overview', 'span-control', 'depth-analysis', 'reporting-chains'])
  const defaultTab: AnalysisTab = 'overview'

  // Get content from URL query parameter or use default
  const getInitialTab = (): AnalysisTab => {
    const urlParams = new URLSearchParams(window.location.search)
    const contentFromUrl = urlParams.get('content') as AnalysisTab

    if (validTabs.has(contentFromUrl)) {
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
      const newTab = validTabs.has(contentFromUrl) ? contentFromUrl : defaultTab
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
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px] gba:bg-gradient-to-b gba:from-background gba:to-muted gba:rounded-lg gba:flex-col"
      >
        <Spinner className="gba:w-8 gba:h-8" />
        <p className="gba:mt-4 gba:text-muted-foreground">{t('hr-analytics-structural-loading')}</p>
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
        <Card className="gba:border-destructive-secondary-foreground gba:bg-destructive-secondary-foreground/25">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-destructive-secondary gba:font-medium gba:mb-2">
                  {t('hr-analytics-structural-error-title')}
                </h3>
                <p className="gba:text-destructive-secondary">{error}</p>
              </div>
              <Button variant="outline" onClick={refetch} className="gba:flex gba:items-center gba:gap-2">
                <PiArrowClockwise />
                {t('common-retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
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
        <Card className="gba:border-info-secondary-foreground gba:bg-info-secondary-foreground/25">
          <CardContent className="gba:p-6">
            <h3 className="gba:text-info-secondary gba:font-medium gba:mb-2">{t('hr-analytics-no-data-available')}</h3>
            <p className="gba:text-info-secondary">{t('hr-analytics-structural-no-data-description')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Overview Tab Content
  const renderOverviewTab = () => (
    <div className="gba:grid gba:gap-6">
      {/* Key Statistics */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-structural-health-overview')}
        </h3>
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
      </div>

      {/* Quick Insights */}
      <div>
        <h3 className="gba:m-0 gba:mb-4 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-key-insights')}
        </h3>
        <div className="gba:grid gba:gap-3">
          <div className="gba:p-3 gba:bg-success-secondary/40 gba:rounded gba:border-l-4 gba:border-l-success">
            <p className="gba:font-semibold gba:text-success-secondary-foreground">
              {t('hr-analytics-span-of-control-label')}: {data.spanOfControlSummary.optimalCount} {t('hr-analytics-of')}{' '}
              {data.spanOfControlSummary.totalManagers} {t('hr-analytics-managers-have-optimal-span')}
            </p>
          </div>
          {data.spanOfControlSummary.overBurdenedCount > 0 && (
            <div className="gba:p-3 gba:bg-destructive-secondary/40 gba:rounded gba:border-l-4 gba:border-l-destructive">
              <p className="gba:font-semibold gba:text-destructive-secondary-foreground">
                {t('hr-analytics-alert')}: {data.spanOfControlSummary.overBurdenedCount}{' '}
                {t('hr-analytics-managers-overburdened')}
              </p>
            </div>
          )}
          <div className="gba:p-3 gba:bg-info-secondary/40 gba:rounded gba:border-l-4 gba:border-l-info">
            <p className="gba:font-semibold gba:text-info-secondary-foreground">
              {t('hr-analytics-organizational-depth-label')}: {t('hr-analytics-maximum-hierarchy-depth-is')}{' '}
              {data.structuralStatistics.hierarchyDepth} {t('hr-analytics-levels')}
            </p>
          </div>
          {data.reportingChainSummary.bottlenecks.length > 0 && (
            <div className="gba:p-3 gba:bg-warning-secondary gba:rounded gba:border-l-4 gba:border-l-warning">
              <p className="gba:font-semibold gba:text-warning-secondary-foreground">
                {t('hr-analytics-warning')}: {data.reportingChainSummary.bottlenecks.length}{' '}
                {t('hr-analytics-management-bottlenecks-identified')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div data-testid={prefixDataTestId} className="gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:leading-9 gba:text-foreground gba:m-0">
            {t('hr-analytics-structural-analysis-reports')}
          </h2>
        </div>
        <Button variant="outline" onClick={refetch} className="gba:flex gba:items-center gba:gap-2">
          <PiArrowClockwise />
          {t('common-refresh-data')}
        </Button>
      </div>

      {/* Description (match Workforce spacing) */}
      <div className="gba:mb-6">
        <p className="gba:text-muted-foreground">{t('hr-analytics-structural-analysis-description')}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full" data-testid="structural-tabs">
        <TabsList className="gba:mb-4">
          <TabsTrigger
            value="overview"
            data-testid="structural-overview-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <span className="gba:inline-flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
              <Icon icon={ChartPieIcon} size="sm" decorative />
              {t('hr-analytics-overview-tab')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="span-control"
            data-testid="structural-span-control-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <span className="gba:inline-flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
              <Icon icon={ChartBarIcon} size="sm" decorative />
              {t('hr-analytics-span-of-control')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="depth-analysis"
            data-testid="structural-depth-analysis-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <span className="gba:inline-flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
              <Icon icon={BuildingsIcon} size="sm" decorative />
              {t('hr-analytics-depth-analysis')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reporting-chains"
            data-testid="structural-reporting-chains-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <span className="gba:inline-flex gba:items-center gba:gap-2 gba:whitespace-nowrap">
              <Icon icon={UsersIcon} size="sm" decorative />
              {t('hr-analytics-reporting-chains')}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="gba:mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="span-control" className="gba:mt-6">
          <SpanOfControlChart
            data={data.spanOfControlData}
            summary={data.spanOfControlSummary}
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>

        <TabsContent value="depth-analysis" className="gba:mt-6">
          <SunburstVisualization data={data.sunburstData} prefixDataTestId={prefixDataTestId} />
        </TabsContent>

        <TabsContent value="reporting-chains" className="gba:mt-6">
          <ReportingChainAnalysis
            chains={data.reportingChainData}
            summary={data.reportingChainSummary}
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Default export for Business App IDE
export default StructuralAnalysisReport
