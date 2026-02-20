import React, { useMemo } from 'react'
import { Typography } from 'antd'
import { SectionKpiCards, KpiCardData, useTranslation, Icon, Card, CardContent } from '@newwork/nw-design-system'
import { UsersIcon, CalendarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useMonthlySalaryForecastEmployee } from '../../../../../hooks/useMonthlySalaryForecastEmployee'
import { useMonthlySalaryChangesEmployees } from '../../../../../hooks/useMonthlySalaryChangesEmployees'
import { useMonthlySalaryByDepartment } from '../../../../../hooks/useMonthlySalaryByDepartment'
import { useDepartmentContributionAnalysis } from '../../../../../hooks/useDepartmentContributionAnalysis'
import SalaryForecastChart from '../SalaryForecastChart'
import SalaryChangesChart from '../SalaryChangesChart'
import DepartmentSalaryStackedBarChart from '../DepartmentSalaryStackedBarChart'
import DepartmentContributionAnalysis from '../DepartmentContributionAnalysis'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { formatTableCell } from '../../../../../utils/valueDisplayUtils'
import { useAnalyticsTableExport } from '../../../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../../../hooks/useChartTableSelection'
import AnalyticsDataTable, {
  DIFFERENT_BADGE,
  DIFFERENT_PERCENTAGE_BADGE,
  HIGHLIGHT_BADGE
} from '../../../../shared/AnalyticsDataTable'

const { Title, Text } = Typography

interface SalaryForecastingProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const SalaryForecasting: React.FC<SalaryForecastingProps> = props => {
  const { prefixDataTestId = 'SalaryForecasting' } = props
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  // Calculate date ranges
  const today = dayjs()
  const currentMonthStart = today.startOf('month')
  const nextMonthStart = currentMonthStart.add(1, 'month')
  const sixMonthsEnd = currentMonthStart.add(6, 'month').endOf('month')
  const yearEnd = today.endOf('year')

  // Fetch data for the full year (for the chart and KPI calculations) - start from beginning of current year
  const fullYearStart = today.startOf('year').format('YYYY-MM-DD')
  const fullYearEnd = yearEnd.format('YYYY-MM-DD')
  const { data: fullYearData, loading: fullYearLoading } = useMonthlySalaryForecastEmployee(
    props.accessToken,
    fullYearStart,
    fullYearEnd
  )
  const { data: salaryChangesData } = useMonthlySalaryChangesEmployees(props.accessToken, fullYearStart, fullYearEnd)
  const { data: departmentSalaryData } = useMonthlySalaryByDepartment(props.accessToken, fullYearStart, fullYearEnd)
  const { data: departmentContributionData } = useDepartmentContributionAnalysis(
    props.accessToken,
    fullYearStart,
    fullYearEnd
  )

  // Calculate next month and 6-month data from full year data
  const nextMonthData = useMemo(() => {
    if (!fullYearData || fullYearData.length === 0) return []
    const nextMonthStr = nextMonthStart.format('YYYY-MM')
    return fullYearData.filter(item => item.month === nextMonthStr)
  }, [fullYearData, nextMonthStart])

  const sixMonthsData = useMemo(() => {
    if (!fullYearData || fullYearData.length === 0) return []
    const nextMonthStr = nextMonthStart.format('YYYY-MM')
    const sixMonthsEndStr = sixMonthsEnd.format('YYYY-MM')
    return fullYearData.filter(item => item.month >= nextMonthStr && item.month <= sixMonthsEndStr)
  }, [fullYearData, nextMonthStart, sixMonthsEnd])

  const loading = fullYearLoading

  // Calculate Salary-related KPI metrics
  const salaryKpiCards: KpiCardData[] = useMemo(() => {
    if (loading) {
      return [
        {
          id: 'total-annual-payroll',
          title: t('hr-analytics-forecasting-kpi-total-annual-payroll'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-1)'
        },
        {
          id: 'total-monthly-salary',
          title: t('hr-analytics-forecasting-kpi-total-monthly-salary'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={UsersIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-2)'
        },
        {
          id: 'next-month-forecast',
          title: t('hr-analytics-forecasting-kpi-next-month-forecast'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CalendarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-3)'
        },
        {
          id: 'six-month-forecast',
          title: t('hr-analytics-forecasting-kpi-six-month-forecast'),
          value: t('hr-data-filter-loading'),
          icon: <Icon icon={CalendarIcon} size="sm" decorative />,
          iconColor: 'var(--nw-chart-4)'
        }
      ]
    }

    // Calculate Next Month Forecast (sum of next month's salary)
    const nextMonthForecast = nextMonthData.reduce((sum, month) => sum + month.totalSalary, 0)

    // Calculate 6-Month Forecast (sum of next 6 months' salary)
    const sixMonthForecast = sixMonthsData.reduce((sum, month) => sum + month.totalSalary, 0)

    // Format large numbers
    const formatSalary = (value: number) => {
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 2 })}M`
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', { maximumFractionDigits: 1 })}K`
      }
      return value.toLocaleString()
    }

    return [
      {
        id: 'total-annual-payroll',
        title: t('hr-analytics-forecasting-kpi-total-annual-payroll'),
        value: t('hr-analytics-coming-soon'),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-1)',
        footer: t('hr-analytics-annual-employee-compensation')
      },
      {
        id: 'total-monthly-salary',
        title: t('hr-analytics-forecasting-kpi-total-monthly-salary'),
        value: t('hr-analytics-coming-soon'),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-2)',
        footer: t('hr-analytics-current-monthly-payroll')
      },
      {
        id: 'next-month-forecast',
        title: t('hr-analytics-forecasting-kpi-next-month-forecast'),
        value: nextMonthData.length === 0 ? '-' : formatSalary(nextMonthForecast),
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-3)',
        footer: t('hr-analytics-projected-monthly-payroll')
      },
      {
        id: 'six-month-forecast',
        title: t('hr-analytics-forecasting-kpi-six-month-forecast'),
        value: sixMonthsData.length === 0 ? '-' : formatSalary(sixMonthForecast),
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-4)',
        footer: t('hr-analytics-six-month-projection')
      }
    ]
  }, [loading, nextMonthData, sixMonthsData, t])

  // Use full year data for the chart
  const monthlyData = useMemo(() => {
    return fullYearData
  }, [fullYearData])

  interface TableDataRow {
    period: string | number
    value: number | string
    headcount?: number
    newHires?: number
    change?: number | string
    department?: string
    percentage?: string
    growth?: string
  }

  const transformSalaryForecastData = (): TableDataRow[] => {
    if (!monthlyData?.length) return []
    return monthlyData.map(item => ({
      period: item.month,
      value: item.totalSalary,
      headcount: item.headcount,
      newHires: item.newHires
    }))
  }

  const transformSalaryChangesData = (): TableDataRow[] => {
    if (!salaryChangesData?.length) return []
    return salaryChangesData.map(item => ({
      period: item.month,
      value: item.change
    }))
  }

  const transformDepartmentSalaryData = (): TableDataRow[] => {
    if (!departmentSalaryData?.length) return []
    return departmentSalaryData.flatMap(month =>
      month.departments.map(department => ({
        period: month.month,
        department: department.name,
        value: department.salary,
        percentage: `${department.percent.toFixed(1)}%`,
        change:
          department.change != null && Number.isFinite(department.change)
            ? Number(department.change).toFixed(2)
            : department.change
      }))
    )
  }

  const transformDepartmentContributionData = (): TableDataRow[] => {
    if (!departmentContributionData?.length) return []
    return departmentContributionData.map(item => ({
      department: item.departmentName,
      value: item.currentSalary,
      period: item.firstMonthSalary,
      percentage: `${item.percentage.toFixed(1)}%`,
      growth: `${item.growthPercentage >= 0 ? '+' : ''}${item.growthPercentage.toFixed(1)}%`
    }))
  }

  const locale = getCurrentActiveUserLocale() ?? 'en-US'
  const formatCell = (value: unknown) => formatTableCell(value, locale)
  const transformRowsForExport = (
    data: TableDataRow[],
    format: 'excel' | 'pdf',
    columns: { key: string; header: string }[]
  ): Record<string, unknown>[] =>
    format === 'pdf'
      ? data.map(row => {
          const out: Record<string, unknown> = {}
          columns.forEach(col => {
            const v = (row as unknown as Record<string, unknown>)[col.key]
            out[col.key] = typeof v === 'number' && Number.isFinite(v) ? formatCell(v) : v
          })
          return out
        })
      : (data.map(row => ({ ...row })) as Record<string, unknown>[])

  const chartConfigs = [
    {
      title: t('hr-analytics-salary-forecasting'),
      testId: 'salary-forecast-chart',
      description: t('hr-analytics-salary-forecasting-description'),
      tag: t('hr-analytics-months', { count: monthlyData?.length ?? 0 }),
      tableData: transformSalaryForecastData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-month') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'headcount', header: t('hr-analytics-employee-count') },
        { key: 'newHires', header: t('hr-analytics-hires') }
      ]
    },
    {
      title: t('hr-analytics-monthly-salary-changes'),
      testId: 'salary-changes-chart',
      description: t('hr-analytics-salary-changes-description'),
      tag: t('hr-analytics-months', { count: salaryChangesData?.length ?? 0 }),
      tableData: transformSalaryChangesData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-month') },
        { key: 'value', header: t('hr-analytics-salary-change'), badge: DIFFERENT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-department-breakdown'),
      testId: 'department-salary-chart',
      description: t('hr-analytics-salary-by-org-unit-description'),
      tag: t('hr-analytics-departments-label'),
      tableData: transformDepartmentSalaryData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-month') },
        { key: 'department', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'percentage', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE },
        { key: 'change', header: t('hr-analytics-change'), badge: DIFFERENT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-department-contribution-analysis'),
      testId: 'department-contribution-chart',
      description: t('hr-analytics-department-contribution-analysis'),
      tag: t('hr-analytics-departments-label'),
      tableData: transformDepartmentContributionData(),
      exportColumns: [
        { key: 'department', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'percentage', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE },
        { key: 'growth', header: t('hr-analytics-change'), badge: DIFFERENT_PERCENTAGE_BADGE }
      ]
    }
  ]
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  return (
    <div data-testid={prefixDataTestId} className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={4} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-salary-forecasting')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-salary-forecasting-description')}</Text>
        </div>
      </div>

      {/* Salary KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-cards`}>
        <SectionKpiCards cards={salaryKpiCards} />
      </div>

      {/* Salary Charts */}
      <div className="gba:mb-2">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-workforce-charts')}</h3>
        <Text className="gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</Text>
      </div>

      <div className="gba:space-y-6">
        <Card
          data-testid={`${prefixDataTestId}-salary-forecast-card`}
          className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
            selectedChart === 'salary-forecast-chart' ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
          }`}
          onClick={() => handleChartClick('salary-forecast-chart')}
        >
          <CardContent className="gba:p-4">
            <SalaryForecastChart data={monthlyData} />
            {selectedChart === 'salary-forecast-chart' && (
              <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
            )}
          </CardContent>
        </Card>

        <Card
          data-testid={`${prefixDataTestId}-salary-changes-card`}
          className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
            selectedChart === 'salary-changes-chart' ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
          }`}
          onClick={() => handleChartClick('salary-changes-chart')}
        >
          <CardContent className="gba:p-4">
            <SalaryChangesChart {...props} />
            {selectedChart === 'salary-changes-chart' && (
              <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
            )}
          </CardContent>
        </Card>

        <Card
          data-testid={`${prefixDataTestId}-department-salary-card`}
          className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
            selectedChart === 'department-salary-chart'
              ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
              : 'gba:hover:shadow-lg'
          }`}
          onClick={() => handleChartClick('department-salary-chart')}
        >
          <CardContent className="gba:p-4">
            <DepartmentSalaryStackedBarChart {...props} />
            {selectedChart === 'department-salary-chart' && (
              <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
            )}
          </CardContent>
        </Card>

        <Card
          data-testid={`${prefixDataTestId}-department-contribution-card`}
          className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
            selectedChart === 'department-contribution-chart'
              ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
              : 'gba:hover:shadow-lg'
          }`}
          onClick={() => handleChartClick('department-contribution-chart')}
        >
          <CardContent className="gba:p-4">
            <DepartmentContributionAnalysis {...props} />
            {selectedChart === 'department-contribution-chart' && (
              <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div ref={tableRef}>
        {selectedConfig && (
          <AnalyticsDataTable
            dataTestId={`${prefixDataTestId}-${selectedConfig.testId}-table`}
            title={t('hr-analytics-data-table', { title: selectedConfig.title })}
            description={selectedConfig.description}
            entriesText={t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
            columns={selectedConfig.exportColumns}
            rows={selectedConfig.tableData}
            exportingFormat={resolveExportingFormat(selectedConfig.testId)}
            exportExcelTestId={`${prefixDataTestId}-${selectedConfig.testId}-export-excel`}
            exportPdfTestId={`${prefixDataTestId}-${selectedConfig.testId}-export-pdf`}
            exportExcelLabel={t('common-export-excel')}
            exportPdfLabel={t('common-export-pdf')}
            onExport={format =>
              handleExport(
                format,
                selectedConfig.testId,
                selectedConfig.title,
                selectedConfig.exportColumns,
                selectedConfig.tableData as unknown as Record<string, unknown>[],
                transformRowsForExport as unknown as (
                  data: Record<string, unknown>[],
                  f: 'excel' | 'pdf',
                  cols: { key: string; header: string }[]
                ) => Record<string, unknown>[]
              )
            }
            getRowKey={(_, index) => `${selectedConfig.testId}-${index}`}
            renderCell={(row, col) => formatCell((row as unknown as Record<string, unknown>)[col.key])}
          />
        )}
      </div>
    </div>
  )
}

export default SalaryForecasting
