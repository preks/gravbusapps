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
  Button,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@newwork/nw-design-system'
import { ChartPieIcon, ChartBarIcon, BuildingsIcon, UsersIcon } from '@phosphor-icons/react'
import { PiArrowClockwise, PiFilePdf, PiFileText } from 'react-icons/pi'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { exportTableToExcel, exportTableToPdf } from '../../../utils/exportUtils'

interface StructuralAnalysisReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const StructuralAnalysisReport: React.FC<StructuralAnalysisReportProps> = props => {
  const { prefixDataTestId = 'StructuralAnalysisReport' } = props
  const { t } = useTranslation(hrTranslations)
  const [exportingTable, setExportingTable] = useState<string | null>(null)

  // Define valid tabs
  const validTabs = new Set<AnalysisTab>(['overview', 'span-control', 'depth-analysis', 'reporting-chains'])
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
    if (tabFromUrl) {
      return tabFromUrl
    } else {
      // No valid content in URL, set default content in URL
      updateUrlWithTab(defaultTab, true)
      return defaultTab
    }
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
  const renderOverviewTab = () => {
    // Stat cards configuration
    const statCards = [
      { value: data.structuralStatistics.totalEmployees, label: 'hr-analytics-total-employees' },
      { value: data.structuralStatistics.totalManagers, label: 'hr-analytics-total-managers' },
      { value: data.structuralStatistics.hierarchyDepth, label: 'hr-analytics-hierarchy-depth' },
      {
        value: data.structuralStatistics.averageSpanOfControl.toFixed(1),
        label: 'hr-analytics-avg-span-of-control'
      },
      {
        value: data.structuralStatistics.averageReportingChainLength.toFixed(1),
        label: 'hr-analytics-avg-chain-length'
      }
    ]

    // Insight cards configuration
    const insightCards = [
      {
        type: 'success' as const,
        content: `${t('hr-analytics-span-of-control-label')}: ${data.spanOfControlSummary.optimalCount} ${t('hr-analytics-of')} ${data.spanOfControlSummary.totalManagers} ${t('hr-analytics-managers-have-optimal-span')}`
      },
      ...(data.spanOfControlSummary.overBurdenedCount > 0
        ? [
            {
              type: 'destructive' as const,
              content: `${t('hr-analytics-alert')}: ${data.spanOfControlSummary.overBurdenedCount} ${t('hr-analytics-managers-overburdened')}`
            }
          ]
        : []),
      {
        type: 'info' as const,
        content: `${t('hr-analytics-organizational-depth-label')}: ${t('hr-analytics-maximum-hierarchy-depth-is')} ${data.structuralStatistics.hierarchyDepth} ${t('hr-analytics-levels')}`
      },
      ...(data.reportingChainSummary.bottlenecks.length > 0
        ? [
            {
              type: 'warning' as const,
              content: `${t('hr-analytics-warning')}: ${data.reportingChainSummary.bottlenecks.length} ${t('hr-analytics-management-bottlenecks-identified')}`
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
          <div className="gba:grid gba:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gba:gap-5">
            {statCards.map((stat, index) => (
              <div key={index} className="gba:text-center gba:p-5 gba:bg-muted gba:rounded-lg">
                <div className="gba:text-3xl gba:font-bold gba:text-foreground">{stat.value}</div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t(stat.label)}</div>
              </div>
            ))}
          </div>
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

  if (activeTab === 'span-control') {
    selectedTableConfig = {
      title: t('hr-analytics-span-of-control'),
      testId: 'span-control',
      rows: data.spanOfControlData.map(item => ({
        manager: item.managerName,
        unit: item.organizationalUnit,
        reports: item.directReports,
        efficiency: item.efficiency
      })),
      columns: [
        { key: 'manager', header: t('hr-analytics-top-manager') },
        { key: 'unit', header: t('hr-analytics-entity-organizational-unit') },
        { key: 'reports', header: t('hr-analytics-value') },
        { key: 'efficiency', header: t('hr-analytics-status') }
      ]
    }
  } else if (activeTab === 'depth-analysis') {
    selectedTableConfig = {
      title: t('hr-analytics-depth-analysis'),
      testId: 'depth-analysis',
      rows: flattenSunburst(data.sunburstData),
      columns: [
        { key: 'unit', header: t('hr-analytics-entity-organizational-unit') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'level', header: t('hr-analytics-level') },
        { key: 'parent', header: t('hr-analytics-top-manager') }
      ]
    }
  } else if (activeTab === 'reporting-chains') {
    selectedTableConfig = {
      title: t('hr-analytics-reporting-chains'),
      testId: 'reporting-chains',
      rows: data.reportingChainData.map(item => ({
        topManager: item.topManager,
        levels: item.levels,
        totalEmployees: item.totalEmployees,
        averageSpan: item.averageSpanOfControl.toFixed(1)
      })),
      columns: [
        { key: 'topManager', header: t('hr-analytics-top-manager') },
        { key: 'levels', header: t('hr-analytics-levels') },
        { key: 'totalEmployees', header: t('hr-analytics-employees') },
        { key: 'averageSpan', header: t('hr-analytics-avg-span-of-control') }
      ]
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedTableConfig) return
    setExportingTable(`${selectedTableConfig.testId}-${format}`)
    try {
      const rows = selectedTableConfig.rows.map(row => ({ ...row })) as Record<string, unknown>[]
      if (format === 'excel') {
        await exportTableToExcel(selectedTableConfig.title, selectedTableConfig.columns, rows)
      } else {
        await exportTableToPdf(selectedTableConfig.title, selectedTableConfig.columns, rows)
      }
    } finally {
      setExportingTable(null)
    }
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
            content: renderOverviewTab()
          },
          {
            value: 'span-control',
            content: (
              <SpanOfControlChart
                data={data.spanOfControlData}
                summary={data.spanOfControlSummary}
                prefixDataTestId={prefixDataTestId}
              />
            )
          },
          {
            value: 'depth-analysis',
            content: <SunburstVisualization data={data.sunburstData} prefixDataTestId={prefixDataTestId} />
          },
          {
            value: 'reporting-chains',
            content: (
              <ReportingChainAnalysis
                chains={data.reportingChainData}
                summary={data.reportingChainSummary}
                prefixDataTestId={prefixDataTestId}
              />
            )
          }
        ].map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="gba:mt-6">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {selectedTableConfig && (
        <Card data-testid={`${prefixDataTestId}-${selectedTableConfig.testId}-table`} className="gba:mt-6">
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-xl">
                  {t('hr-analytics-data-table', { title: selectedTableConfig.title })}
                </CardTitle>
                <Badge variant="outline" className="gba:bg-success-secondary gba:text-success-secondary-foreground">
                  {t('hr-analytics-total-entries', { count: selectedTableConfig.rows.length })}
                </Badge>
              </div>
              <div className="gba:flex gba:gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`${prefixDataTestId}-${selectedTableConfig.testId}-export-excel`}
                  disabled={exportingTable === `${selectedTableConfig.testId}-excel`}
                  onClick={() => handleExport('excel')}
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <PiFileText className="gba:w-3 gba:h-3" />
                  {t('common-export-excel')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`${prefixDataTestId}-${selectedTableConfig.testId}-export-pdf`}
                  disabled={exportingTable === `${selectedTableConfig.testId}-pdf`}
                  onClick={() => handleExport('pdf')}
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <PiFilePdf className="gba:w-3 gba:h-3" />
                  {t('common-export-pdf')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="gba:max-h-96 gba:overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedTableConfig.columns.map(col => (
                      <TableHead key={col.key}>{col.header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTableConfig.rows.map((row, index) => (
                    <TableRow key={`${selectedTableConfig.testId}-${index}`}>
                      {selectedTableConfig.columns.map(col => (
                        <TableCell key={`${col.key}-${index}`}>
                          {String((row as Record<string, unknown>)[col.key] ?? '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Default export for Business App IDE
export default StructuralAnalysisReport
