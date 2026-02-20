import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import HeadcountStatistics from '../components/HeadcountStatistics'
import HeadcountTrendsChart from '../components/HeadcountTrendsChart'
import HiresAndDeparturesChart from '../components/HiresAndDeparturesChart'
import HeadcountByOrgUnitChart from '../components/HeadcountByOrgUnitChart'
import { useHeadcountTrendsData } from '../../../../../hooks/useHeadcountTrendsData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../../../hooks/useChartTableSelection'
import { DIFFERENT_BADGE } from '../../../../shared/AnalyticsDataTable'
import type { AnalyticsTableData } from '../../../../shared/analyticsTabTypes'
import AnalyticsTabErrorCard from '../../../../shared/AnalyticsTabErrorCard'
import SelectableChartCard from '../../../../shared/SelectableChartCard'
import AnalyticsTableSection from '../../../../shared/AnalyticsTableSection'

const HeadcountTrends: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  const {
    statistics,
    headcountOverTime,
    monthlyHires,
    monthlyExits,
    netChange,
    departmentData,
    isLoading,
    error,
    refetch
  } = useHeadcountTrendsData(context)

  // Transform data functions for tables
  const transformHeadcountOverTimeData = (): AnalyticsTableData[] => {
    return headcountOverTime.map((item, index) => ({
      period: new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      value: item.value,
      change: index > 0 ? item.value - headcountOverTime[index - 1].value : 0
    }))
  }

  const transformHiresAndDeparturesData = (): AnalyticsTableData[] => {
    const hiresMap = new Map(monthlyHires.map(h => [h.dateCategory, h.value]))
    const exitsMap = new Map(monthlyExits.map(e => [e.dateCategory, e.value]))

    const allDates = Array.from(
      new Set([...monthlyHires.map(h => h.dateCategory), ...monthlyExits.map(e => e.dateCategory)])
    ).sort()

    return allDates.map(date => ({
      period: new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      value: (hiresMap.get(date) || 0) - (exitsMap.get(date) || 0),
      change: hiresMap.get(date) || 0
    }))
  }

  const transformOrgUnitData = (): AnalyticsTableData[] => {
    return departmentData.map(item => ({
      period: item.category,
      value: item.value,
      change: 0
    }))
  }

  // Chart configurations
  const chartConfigs = [
    {
      title: t('hr-analytics-total-headcount-over-time'),
      data: headcountOverTime,
      tableData: transformHeadcountOverTimeData(),
      testId: 'headcount-trends-chart',
      tag: t('hr-analytics-total-data-points', { count: headcountOverTime.length }),
      description: t('hr-analytics-headcount-trends-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change'), badge: DIFFERENT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-monthly-hires-departures'),
      data: [...monthlyHires, ...monthlyExits],
      tableData: transformHiresAndDeparturesData(),
      testId: 'hires-departures-chart',
      tag: t('hr-analytics-months', { count: Math.max(monthlyHires.length, monthlyExits.length) }),
      description: t('hr-analytics-hires-departures-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change'), badge: DIFFERENT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-headcount-by-org-unit'),
      data: departmentData,
      tableData: transformOrgUnitData(),
      testId: 'headcount-by-org-unit-chart',
      tag: t('hr-analytics-departments', { count: departmentData.length }),
      description: t('hr-analytics-headcount-by-org-unit-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-value') }
      ]
    }
  ]

  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (error) {
    return (
      <AnalyticsTabErrorCard
        dataTestId="headcount-trends-error"
        message={t('hr-analytics-failed-to-load-headcount')}
        detail={error}
        retryLabel={t('common-retry')}
        onRetry={refetch}
        variant="row"
      />
    )
  }

  return (
    <div data-testid="headcount-trends-tab">
      {/* Statistics Overview */}
      <HeadcountStatistics statistics={statistics} isLoading={isLoading} dataTestId="headcount-trends" />

      {/* Interactive Charts Section */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-workforce-charts')}</h3>
        <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
      </div>

      {/* Top Row: Two Charts Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mt-6">
        {chartConfigs.slice(0, 2).map(config => (
          <SelectableChartCard
            key={config.testId}
            testId={config.testId}
            isSelected={selectedChart === config.testId}
            onSelect={() => handleChartClick(config.testId)}
            title={config.title}
            tag={config.tag}
            description={config.description}
            selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
          >
            {config.testId === 'headcount-trends-chart' && (
              <HeadcountTrendsChart
                data={headcountOverTime}
                isLoading={isLoading}
                dataTestId="headcount-trends-chart"
              />
            )}
            {config.testId === 'hires-departures-chart' && (
              <HiresAndDeparturesChart
                hiresData={monthlyHires}
                exitsData={monthlyExits}
                netChangeData={netChange}
                isLoading={isLoading}
                dataTestId="hires-departures-chart"
              />
            )}
          </SelectableChartCard>
        ))}
      </div>

      {/* Bottom Row: Full Width Chart */}
      <div className="gba:mt-6">
        <SelectableChartCard
          testId={chartConfigs[2].testId}
          isSelected={selectedChart === chartConfigs[2].testId}
          onSelect={() => handleChartClick(chartConfigs[2].testId)}
          title={chartConfigs[2].title}
          tag={chartConfigs[2].tag}
          description={chartConfigs[2].description}
          selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
        >
          <HeadcountByOrgUnitChart
            data={departmentData}
            isLoading={isLoading}
            dataTestId="headcount-by-org-unit-chart"
          />
        </SelectableChartCard>
      </div>

      {/* Interactive Data Table */}
      <AnalyticsTableSection<AnalyticsTableData>
        tableRef={tableRef}
        selectedConfig={selectedConfig}
        resolveExportingFormat={resolveExportingFormat}
        handleExport={handleExport}
        exportExcelLabel={t('common-export-excel')}
        exportPdfLabel={t('common-export-pdf')}
        tableTitle={selectedConfig ? t('hr-analytics-data-table', { title: selectedConfig.title }) : ''}
        entriesText={selectedConfig ? t('hr-analytics-total-entries', { count: selectedConfig.tableData.length }) : ''}
        clickToViewMessage={t('hr-analytics-click-to-view-table')}
        renderCell={(item, col) => {
          if (col.key === 'period') return <span className="gba:font-medium">{item.period}</span>
          if (col.key === 'value')
            return typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)
          return undefined
        }}
        footer={
          selectedConfig ? (
            <div className="gba:mt-4 gba:p-3 gba:bg-muted gba:rounded-md gba:flex gba:justify-between gba:items-center">
              <span className="gba:font-medium gba:text-sm">
                {t('hr-analytics-total-data-points', { count: selectedConfig.tableData.length })}
              </span>
              <span className="gba:text-sm gba:text-muted-foreground">{selectedConfig.title}</span>
            </div>
          ) : undefined
        }
      />
    </div>
  )
}

export default HeadcountTrends
