import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useStructuralAnalysisDataIntegration } from '../../../hooks/useStructuralAnalysisDataIntegration'
import { SunburstVisualization } from './components/SunburstVisualization'
import { SpanOfControlChart } from './components/SpanOfControlChart'
import { ReportingChainAnalysis } from './components/ReportingChainAnalysis'
import OrganizationalHierarchyReport from './components/organizational-hierarchy-report/OrgHierarchyReport'
import { AnalysisTab } from './types/structuralTypes'

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation,
  SectionKpiCards,
  type KpiCardData,
  Icon,
  Button
} from '@newwork/nw-design-system'
import {
  ArrowClockwiseIcon,
  ChartPieIcon,
  ChartBarIcon,
  BuildingsIcon,
  UsersIcon,
  TreeStructureIcon
} from '@phosphor-icons/react'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { exportTableToExcel, exportTableToPdf } from '../../../utils/exportUtils'
import AnalyticsDataTable from '../../shared/AnalyticsDataTable'
import AnalyticsTabErrorCard from '../../shared/AnalyticsTabErrorCard'
import AnalyticsTabLoadingState from '../../shared/AnalyticsTabLoadingState'

interface StructuralAnalysisReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const StructuralAnalysisReport: React.FC<StructuralAnalysisReportProps> = props => {
  const { prefixDataTestId = 'StructuralAnalysisReport' } = props
  const { t } = useTranslation(hrTranslations)
  const [exportingTable, setExportingTable] = useState<string | null>(null)

  // Define valid tabs
  const validTabs = new Set<AnalysisTab>([
    'overview',
    'span-control',
    'depth-analysis',
    'reporting-chains',
    'organizational-hierarchy'
  ])
  const defaultTab: AnalysisTab = 'overview'

  // Helper function to get tab from URL
  const getTabFromUrl = (): AnalysisTab | null => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const contentFromUrl = urlParams.get('content') as AnalysisTab
    return validTabs.has(contentFromUrl) ? contentFromUrl : null
  }

  // Helper function to update URL with tab
  const updateUrlWithTab = (tab: AnalysisTab, replace: boolean = false) => {
    const url = new URL(globalThis.location.href)
    url.searchParams.set('content', tab)
    if (replace) {
      globalThis.history.replaceState({}, '', url.toString())
    } else {
      globalThis.history.pushState({}, '', url.toString())
    }
  }

  // Get content from URL query parameter or use default
  const getInitialTab = (): AnalysisTab => {
    const tabFromUrl = getTabFromUrl()
    return tabFromUrl ?? defaultTab
  }

  const [activeTab, setActiveTab] = useState<AnalysisTab>(getInitialTab)

  const { data, isLoading, error, refetch } = useStructuralAnalysisDataIntegration(props)

  // Update URL when content changes
  const handleTabChange = (key: string) => {
    const newTab = key as AnalysisTab
    setActiveTab(newTab)
    updateUrlWithTab(newTab)
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tabFromUrl = getTabFromUrl()
      const newTab = tabFromUrl ?? defaultTab
      setActiveTab(newTab)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  // Ensure URL always has a valid content tab after mount
  useEffect(() => {
    if (!getTabFromUrl()) {
      updateUrlWithTab(defaultTab, true)
    }
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <AnalyticsTabLoadingState
        dataTestId={`${prefixDataTestId}-Loading`}
        message={t('hr-data-filter-loading-data')}
        className="gba:min-h-[400px] gba:bg-gradient-to-b gba:from-background gba:to-muted gba:rounded-lg"
      />
    )
  }

  const unavailableContent = error ? (
    <AnalyticsTabErrorCard
      dataTestId={`${prefixDataTestId}-Error`}
      message={t('hr-analytics-structural-error-title')}
      detail={error}
      retryLabel={t('common-retry')}
      onRetry={refetch}
      className="gba:p-0"
    />
  ) : (
    <AnalyticsTabErrorCard
      dataTestId={`${prefixDataTestId}-NoData`}
      message={t('hr-analytics-no-data-available')}
      detail={t('hr-analytics-structural-no-data-description')}
      retryLabel={t('common-retry')}
      onRetry={refetch}
      className="gba:p-0"
    />
  )

  // Overview Tab Content
  const renderOverviewTab = (structuralData: NonNullable<typeof data>) => {
    const statCards: KpiCardData[] = [
      {
        id: 'overview-total-employees',
        title: t('hr-analytics-total-employees'),
        value: structuralData.structuralStatistics.totalEmployees,
        footer: t('hr-analytics-structural-health-overview')
      },
      {
        id: 'overview-total-managers',
        title: t('hr-analytics-total-managers'),
        value: structuralData.structuralStatistics.totalManagers,
        footer: t('hr-analytics-span-of-control-summary')
      },
      {
        id: 'overview-hierarchy-depth',
        title: t('hr-analytics-hierarchy-depth'),
        value: structuralData.structuralStatistics.hierarchyDepth,
        footer: t('hr-analytics-levels-title')
      },
      {
        id: 'overview-average-span',
        title: t('hr-analytics-avg-span-of-control'),
        value: structuralData.structuralStatistics.averageSpanOfControl.toFixed(1),
        footer: `${t('hr-analytics-recommended-span-range')}: ${structuralData.spanOfControlSummary.recommendedSpanMin}-${structuralData.spanOfControlSummary.recommendedSpanMax}`
      },
      {
        id: 'overview-average-chain',
        title: t('hr-analytics-avg-chain-length'),
        value: structuralData.structuralStatistics.averageReportingChainLength.toFixed(1),
        footer: t('hr-analytics-reporting-chain-summary')
      }
    ]

    // Insight cards configuration
    const insightCards = [
      {
        type: 'success' as const,
        content: `${t('hr-analytics-span-of-control-label')}: ${structuralData.spanOfControlSummary.optimalCount} ${t('hr-analytics-of')} ${structuralData.spanOfControlSummary.totalManagers} ${t('hr-analytics-managers-have-optimal-span')}`
      },
      ...(structuralData.spanOfControlSummary.overBurdenedCount > 0
        ? [
            {
              type: 'destructive' as const,
              content: `${t('hr-analytics-alert')}: ${structuralData.spanOfControlSummary.overBurdenedCount} ${t('hr-analytics-managers-overburdened')}`
            }
          ]
        : []),
      {
        type: 'info' as const,
        content: `${t('hr-analytics-organizational-depth-label')}: ${t('hr-analytics-maximum-hierarchy-depth-is')} ${structuralData.structuralStatistics.hierarchyDepth} ${t('hr-analytics-levels')}`
      },
      ...(structuralData.reportingChainSummary.bottlenecks.length > 0
        ? [
            {
              type: 'warning' as const,
              content: `${t('hr-analytics-warning')}: ${structuralData.reportingChainSummary.bottlenecks.length} ${t('hr-analytics-management-bottlenecks-identified')}`
            }
          ]
        : [])
    ]

    return (
      <div className="gba:grid gba:gap-6">
        {/* Key Statistics */}
        <div>
          <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
            {t('hr-analytics-structural-health-overview')}
          </h3>
          <SectionKpiCards cards={statCards} />
        </div>

        {/* Quick Insights */}
        <div>
          <h3 className="gba:m-0 gba:mb-4 gba:text-foreground gba:text-xl gba:font-semibold">
            {t('hr-analytics-key-insights')}
          </h3>
          <div className="gba:grid gba:gap-3">
            {insightCards.map((insight, index) => {
              const colorClasses = {
                success: 'gba:bg-success-secondary/40 gba:border-l-success gba:text-success-secondary-foreground',
                destructive:
                  'gba:bg-destructive-secondary/40 gba:border-l-destructive gba:text-destructive-secondary-foreground',
                info: 'gba:bg-info-secondary/40 gba:border-l-info gba:text-info-secondary-foreground',
                warning: 'gba:bg-warning-secondary gba:border-l-warning gba:text-warning-secondary-foreground'
              }
              return (
                <div key={index} className={`gba:p-3 gba:rounded gba:border-l-4 ${colorClasses[insight.type]}`}>
                  <p className="gba:font-semibold">{insight.content}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const flattenSunburst = (
    node: any,
    level = 0,
    parent = '-'
  ): Array<{ unit: string; value: number; level: number; parent: string }> => {
    if (node?.level === -1 && Array.isArray(node?.children)) {
      return node.children.flatMap((child: any) => flattenSunburst(child, 0, '-'))
    }

    const current = [{ unit: node?.name ?? '-', value: Number(node?.value ?? 0), level, parent }]
    const children = Array.isArray(node?.children)
      ? node.children.flatMap((child: any) => flattenSunburst(child, level + 1, String(node?.name ?? '-')))
      : []
    return [...current, ...children]
  }

  let selectedTableConfig: {
    title: string
    testId: string
    rows: Array<Record<string, string | number>>
    columns: Array<{ key: string; header: string }>
  } | null = null

  if (data && activeTab === 'span-control') {
    selectedTableConfig = {
      title: t('hr-analytics-span-of-control'),
      testId: 'span-control',
      rows: data.spanOfControlData.map(item => ({
        unit: item.organizationalUnit,
        value: Number.isFinite(item.directReports) ? item.directReports : 0,
        efficiency: item.efficiency
      })),
      columns: [
        { key: 'unit', header: t('hr-analytics-entity-organizational-unit') },
        { key: 'value', header: t('hr-analytics-direct-reports') },
        { key: 'efficiency', header: t('hr-analytics-status') }
      ]
    }
  } else if (data && activeTab === 'depth-analysis') {
    selectedTableConfig = {
      title: t('hr-analytics-depth-analysis'),
      testId: 'depth-analysis',
      rows: flattenSunburst(data.sunburstData),
      columns: [
        { key: 'unit', header: t('hr-analytics-entity-organizational-unit') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'level', header: t('hr-analytics-level') },
        { key: 'parent', header: t('hr-analytics-parent-organizational-unit') }
      ]
    }
  } else if (data && activeTab === 'reporting-chains') {
    selectedTableConfig = {
      title: t('hr-analytics-reporting-chains'),
      testId: 'reporting-chains',
      rows: data.reportingChainData.map(item => ({
        topOrgUnit: item.topManager,
        levels: item.levels,
        chainPath: item.chainPath || '-',
        bottlenecks: item.bottlenecks.length > 0 ? item.bottlenecks.join(', ') : t('hr-analytics-none'),
        efficiency: `${item.efficiency}%`
      })),
      columns: [
        { key: 'topOrgUnit', header: t('hr-analytics-top-org-unit') },
        { key: 'levels', header: t('hr-analytics-levels-title') },
        { key: 'chainPath', header: t('hr-analytics-reporting-chains') },
        { key: 'bottlenecks', header: t('hr-analytics-bottlenecks') },
        { key: 'efficiency', header: t('hr-analytics-efficiency') }
      ]
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedTableConfig) return
    setExportingTable(`${selectedTableConfig.testId}-${format}`)
    try {
      const rows = selectedTableConfig.rows.map(row => ({ ...row })) as Record<string, unknown>[]
      if (selectedTableConfig.testId === 'span-control') {
        rows.forEach(row => {
          const numericValue = Number(row.value)
          row.value = Number.isFinite(numericValue) ? numericValue : 0
        })
      }
      if (format === 'excel') {
        await exportTableToExcel(selectedTableConfig.title, selectedTableConfig.columns, rows)
      } else {
        await exportTableToPdf(selectedTableConfig.title, selectedTableConfig.columns, rows)
      }
    } finally {
      setExportingTable(null)
    }
  }
  const resolveExportingFormat = (tableName: string): 'excel' | 'pdf' | null => {
    if (exportingTable === `${tableName}-excel`) return 'excel'
    if (exportingTable === `${tableName}-pdf`) return 'pdf'
    return null
  }

  return (
    <div data-testid={prefixDataTestId} className="gba:min-h-full gba:p-6 gba:rounded-lg">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:leading-9 gba:text-foreground gba:m-0">
            {t('hr-analytics-structural-analysis-reports')}
          </h2>
        </div>
        <Button onClick={refetch} className="gba:flex gba:items-center gba:gap-2">
          <ArrowClockwiseIcon />
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
          {[
            {
              value: 'overview',
              icon: ChartPieIcon,
              label: 'hr-analytics-overview-tab',
              testId: 'structural-overview-tab'
            },
            {
              value: 'span-control',
              icon: ChartBarIcon,
              label: 'hr-analytics-span-of-control',
              testId: 'structural-span-control-tab'
            },
            {
              value: 'depth-analysis',
              icon: BuildingsIcon,
              label: 'hr-analytics-depth-analysis',
              testId: 'structural-depth-analysis-tab'
            },
            {
              value: 'reporting-chains',
              icon: UsersIcon,
              label: 'hr-analytics-reporting-chains',
              testId: 'structural-reporting-chains-tab'
            },
            {
              value: 'organizational-hierarchy',
              icon: TreeStructureIcon,
              label: 'hr-analytics-organizational-hierarchy',
              testId: 'structural-organizational-hierarchy-tab'
            }
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-testid={tab.testId}
              className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:gap-2"
              title={t(tab.label)}
            >
              <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
                <Icon icon={tab.icon} size="sm" decorative />
                {t(tab.label)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {[
          {
            value: 'overview',
            content: data ? renderOverviewTab(data) : unavailableContent
          },
          {
            value: 'span-control',
            content: data ? (
              <SpanOfControlChart
                data={data.spanOfControlData}
                summary={data.spanOfControlSummary}
                prefixDataTestId={prefixDataTestId}
              />
            ) : (
              unavailableContent
            )
          },
          {
            value: 'depth-analysis',
            content: data ? (
              <SunburstVisualization data={data.sunburstData} prefixDataTestId={prefixDataTestId} />
            ) : (
              unavailableContent
            )
          },
          {
            value: 'reporting-chains',
            content: data ? (
              <ReportingChainAnalysis
                chains={data.reportingChainData}
                summary={data.reportingChainSummary}
                prefixDataTestId={prefixDataTestId}
              />
            ) : (
              unavailableContent
            )
          },
          {
            value: 'organizational-hierarchy',
            content: data ? (
              <OrganizationalHierarchyReport
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                additionalData={props.additionalData}
              />
            ) : (
              unavailableContent
            )
          }
        ].map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="gba:mt-6">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {selectedTableConfig && (
        <AnalyticsDataTable
          dataTestId={`${prefixDataTestId}-${selectedTableConfig.testId}-table`}
          className="gba:mt-6"
          title={t('hr-analytics-data-table', { title: selectedTableConfig.title })}
          entriesText={t('hr-analytics-total-entries', { count: selectedTableConfig.rows.length })}
          columns={selectedTableConfig.columns}
          rows={selectedTableConfig.rows}
          exportingFormat={resolveExportingFormat(selectedTableConfig.testId)}
          exportExcelTestId={`${prefixDataTestId}-${selectedTableConfig.testId}-export-excel`}
          exportPdfTestId={`${prefixDataTestId}-${selectedTableConfig.testId}-export-pdf`}
          exportExcelLabel={t('common-export-excel')}
          exportPdfLabel={t('common-export-pdf')}
          onExport={handleExport}
          getRowKey={(_, index) => `${selectedTableConfig.testId}-${index}`}
        />
      )}
    </div>
  )
}

// Default export for Business App IDE
export default StructuralAnalysisReport
