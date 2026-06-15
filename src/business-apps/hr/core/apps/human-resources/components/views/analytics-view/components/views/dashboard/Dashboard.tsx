import React, { useMemo } from 'react'
import { SectionKpiCards, KpiCardData, useTranslation, Icon } from '@newwork/nw-design-system'
import { UsersIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { DashboardProps, AnalyticsKpiData } from './types/analyticsTypes'
import { useNewHiresCount } from '../../../hooks/useNewHiresCount'
import { useTurnoverRate } from '../../../hooks/useTurnoverRate'
import { useCompensationMetrics } from '@/business-apps/hr/compensation/apps/transparency/hooks/useCompensationMetrics.ts'
import { useHiresPerYear } from '../../../hooks/useHiresPerYear'
import { useEmployeesPerYear } from '../../../hooks/useEmployeesPerYear'
import { useEmployeesByOrgUnit } from '../../../hooks/useEmployeesByOrgUnit'
import HiresPerYearChart from './components/charts/HiresPerYearChart'
import EmployeesPerYearChart from './components/charts/EmployeesPerYearChart'
import EmployeesByOrgUnitChart from './components/charts/EmployeesByOrgUnitChart'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../hooks/useChartTableSelection'
import AnalyticsDataTable, { DIFFERENT_BADGE, HIGHLIGHT_BADGE } from '../../shared/AnalyticsDataTable'
import SelectableChartCard from '../../shared/SelectableChartCard'
import AnalyticsTabErrorCard from '../../shared/AnalyticsTabErrorCard'
import AnalyticsTabLoadingState from '../../shared/AnalyticsTabLoadingState'

interface TableDataRow {
  period: string
  value: number | string
  change?: number | string
  percentage?: string
}

/**
 * HR Analytics Dashboard component that displays various HR metrics and analytics
 */
const Dashboard: React.FC<DashboardProps> = ({ accessToken }) => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  // Get data from custom hooks
  const { count: newHiresCount, loading: hiresLoading } = useNewHiresCount(accessToken)
  const { rate: turnoverRate, change: turnoverChange, loading: turnoverLoading } = useTurnoverRate(accessToken)
  const { averageSalary, loading: salaryLoading } = useCompensationMetrics(accessToken)
  const { hiresData, loading: hiresYearlyLoading, error: hiresYearlyError } = useHiresPerYear(accessToken)
  const {
    data: employeesYearlyData,
    loading: employeesYearlyLoading,
    error: employeesYearlyError
  } = useEmployeesPerYear(accessToken)
  const {
    data: employeesByOrgUnitData,
    loading: employeesByOrgUnitLoading,
    error: employeesByOrgUnitError
  } = useEmployeesByOrgUnit(accessToken)

  const { employeeCount, employeeCountDiffYoY } = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const byYear = new Map(employeesYearlyData.map(item => [item.year, item.count]))
    const thisYear = Number(byYear.get(currentYear) ?? 0)
    const lastYear = Number(byYear.get(currentYear - 1) ?? 0)
    return {
      employeeCount: thisYear,
      employeeCountDiffYoY: thisYear - lastYear
    }
  }, [employeesYearlyData])

  // Combine loading states for simplicity
  const loading =
    hiresLoading ||
    turnoverLoading ||
    salaryLoading ||
    employeesYearlyLoading ||
    hiresYearlyLoading ||
    employeesByOrgUnitLoading
  const dashboardError = hiresYearlyError || employeesYearlyError || employeesByOrgUnitError

  // Format analytics KPI data
  const analyticsData: AnalyticsKpiData = useMemo(
    () => ({
      employeeCount: {
        value: employeeCount,
        label: t('hr-analytics-total-employees')
      },
      newHires: {
        value: newHiresCount,
        label: t('hr-analytics-new-hires-ytd')
      },
      turnoverRate: {
        value: turnoverRate,
        change: turnoverChange,
        label: t('hr-analytics-turnover-rate')
      },
      averageSalary: {
        value: Math.round(averageSalary / 1000), // Convert to thousands
        label: t('hr-analytics-annual-average')
      }
    }),
    [employeeCount, newHiresCount, turnoverRate, turnoverChange, averageSalary, t]
  )

  // Create KPI cards data for SectionKpiCards component
  const kpiCards: KpiCardData[] = useMemo(() => {
    if (loading) {
      return [
        {
          id: 'total-employees',
          title: analyticsData.employeeCount.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-info)'
        },
        {
          id: 'new-hires',
          title: analyticsData.newHires.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-success)'
        },
        {
          id: 'turnover-rate',
          title: analyticsData.turnoverRate.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-warning)'
        },
        {
          id: 'average-salary',
          title: analyticsData.averageSalary.label,
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-decorative)'
        }
      ]
    }

    return [
      {
        id: 'total-employees',
        title: analyticsData.employeeCount.label,
        value: analyticsData.employeeCount.value.toLocaleString(),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        trend: {
          value: `${employeeCountDiffYoY > 0 ? '+' : ''}${employeeCountDiffYoY}`,
          positive: employeeCountDiffYoY > 0 ? true : false,
          description: t('hr-analytics-this-year')
        },
        footer: t('hr-analytics-active-employees')
      },
      {
        id: 'turnover-rate',
        title: analyticsData.turnoverRate.label,
        value: `${analyticsData.turnoverRate.value.toFixed(1)}%`,
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: analyticsData.turnoverRate.change < 0 ? 'var(--nw-success)' : 'var(--nw-warning)',
        trend: {
          value: `${analyticsData.turnoverRate.change > 0 ? '+' : ''}${analyticsData.turnoverRate.change.toFixed(1)}%`,
          positive: analyticsData.turnoverRate.change > 0 ? true : false
        },
        footer: `${analyticsData.turnoverRate.change > 0 ? '+' : ''}${analyticsData.turnoverRate.change.toFixed(1)}% ${t('hr-analytics-vs-last-month')}`
      },
      {
        id: 'average-salary',
        title: analyticsData.averageSalary.label,
        value: `${analyticsData.averageSalary.value}K`,
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        footer: t('hr-analytics-annual-average')
      }
    ]
  }, [loading, analyticsData, t])

  const transformEmployeesPerYearData = (): TableDataRow[] => {
    return employeesYearlyData.map((item, index) => ({
      period: String(item.year),
      value: item.count,
      change: index > 0 ? item.count - employeesYearlyData[index - 1].count : 0
    }))
  }

  const transformHiresPerYearData = (): TableDataRow[] => {
    return hiresData.map((item, index) => ({
      period: String(item.year),
      value: item.count,
      change: index > 0 ? item.count - hiresData[index - 1].count : 0
    }))
  }

  const transformEmployeesByOrgUnitData = (): TableDataRow[] => {
    return employeesByOrgUnitData.map(item => ({
      period: item.name,
      value: item.count,
      percentage: `${item.percentage.toFixed(1)}%`
    }))
  }

  const chartConfigs = [
    {
      title: t('hr-analytics-employees-per-year'),
      testId: 'employees-per-year-chart',
      tag: t('hr-analytics-total-data-points', { count: employeesYearlyData.length }),
      description: t('hr-analytics-employees-per-year-description'),
      tableData: transformEmployeesPerYearData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-year') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change'), badge: DIFFERENT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-hires-per-year'),
      testId: 'hires-per-year-chart',
      tag: t('hr-analytics-total-data-points', { count: hiresData.length }),
      description: t('hr-analytics-hires-per-year-description'),
      tableData: transformHiresPerYearData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-year') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change'), badge: DIFFERENT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-employees-by-org-unit'),
      testId: 'employees-by-org-unit-chart',
      tag: t('hr-analytics-departments', { count: employeesByOrgUnitData.length }),
      description: t('hr-analytics-employees-by-org-unit-description'),
      tableData: transformEmployeesByOrgUnitData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'percentage', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE }
      ]
    }
  ]
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (loading) {
    return (
      <AnalyticsTabLoadingState
        dataTestId="hr-analytics-loading"
        message={t('hr-data-filter-loading-data')}
        className="gba:py-12"
      />
    )
  }

  if (dashboardError) {
    return (
      <AnalyticsTabErrorCard
        dataTestId="hr-analytics-dashboard-error"
        message={t('hr-analytics-data-error')}
        detail={dashboardError.message}
        retryLabel={t('common-retry')}
        onRetry={() => globalThis.location.reload()}
        className="gba:p-6"
      />
    )
  }

  return (
    <div className="gba:w-full" data-testid="hr-analytics-dashboard">
      <div className="gba:p-6 gba:pb-0">
        <div className="gba:mb-6">
          <h2 className="gba:m-0 gba:text-2xl gba:font-semibold gba:text-foreground">
            {t('hr-analytics-dashboard-title')}
          </h2>
          <p className="gba:text-muted-foreground">{t('hr-analytics-dashboard-subtitle')}</p>
        </div>

        {/* KPI Cards Section - Using SectionKpiCards component */}
        <div className="gba:mb-8" data-testid="dashboard-kpi-cards">
          <SectionKpiCards cards={kpiCards} />
        </div>

        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-workforce-charts')}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <SelectableChartCard
            testId="employees-per-year-chart"
            isSelected={selectedChart === 'employees-per-year-chart'}
            onSelect={() => handleChartClick('employees-per-year-chart')}
            title={chartConfigs[0].title}
            tag={chartConfigs[0].tag}
            description={chartConfigs[0].description}
            selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
          >
            <EmployeesPerYearChart
              data={employeesYearlyData}
              loading={employeesYearlyLoading}
              error={employeesYearlyError}
            />
          </SelectableChartCard>

          <SelectableChartCard
            testId="hires-per-year-chart"
            isSelected={selectedChart === 'hires-per-year-chart'}
            onSelect={() => handleChartClick('hires-per-year-chart')}
            title={chartConfigs[1].title}
            tag={chartConfigs[1].tag}
            description={chartConfigs[1].description}
            selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
          >
            <HiresPerYearChart data={hiresData} loading={hiresYearlyLoading} error={hiresYearlyError} />
          </SelectableChartCard>

          <div className="gba:col-span-1 gba:md:col-span-2">
            <SelectableChartCard
              testId="employees-by-org-unit-chart"
              isSelected={selectedChart === 'employees-by-org-unit-chart'}
              onSelect={() => handleChartClick('employees-by-org-unit-chart')}
              title={chartConfigs[2].title}
              tag={chartConfigs[2].tag}
              description={chartConfigs[2].description}
              selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
            >
              <EmployeesByOrgUnitChart
                data={employeesByOrgUnitData}
                loading={employeesByOrgUnitLoading}
                error={employeesByOrgUnitError}
              />
            </SelectableChartCard>
          </div>
        </div>

        <div ref={tableRef}>
          {selectedConfig && (
            <AnalyticsDataTable
              dataTestId={`${selectedConfig.testId}-table`}
              className="gba:mt-6"
              title={t('hr-analytics-data-table', { title: selectedConfig.title })}
              description={selectedConfig.description}
              entriesText={t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
              columns={selectedConfig.exportColumns}
              rows={selectedConfig.tableData}
              exportingFormat={resolveExportingFormat(selectedConfig.testId)}
              exportExcelTestId={`dashboard-${selectedConfig.testId}-export-excel`}
              exportPdfTestId={`dashboard-${selectedConfig.testId}-export-pdf`}
              exportExcelLabel={t('common-export-excel')}
              exportPdfLabel={t('common-export-pdf')}
              onExport={format =>
                handleExport(
                  format,
                  selectedConfig.testId,
                  selectedConfig.title,
                  selectedConfig.exportColumns,
                  selectedConfig.tableData as unknown as Record<string, unknown>[]
                )
              }
              getRowKey={(_, index) => `${selectedConfig.testId}-${index}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
