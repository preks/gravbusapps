import React, { useMemo, useRef, useState } from 'react'
import { Typography, Spin } from 'antd'
import {
  SectionKpiCards,
  KpiCardData,
  useTranslation,
  Icon,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Button,
  Badge
} from '@newwork/nw-design-system'
import { UsersIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { PiFileText, PiFilePdf } from 'react-icons/pi'
import { DashboardProps, AnalyticsKpiData } from './types/analyticsTypes'
import { useEmployeeCount } from '../../../hooks/useEmployeeCount'
import { useNewHiresCount } from '../../../hooks/useNewHiresCount'
import { useTurnoverRate } from '../../../hooks/useTurnoverRate'
import { useCompensationMetrics } from '../../../hooks/useCompensationMetrics'
import { useHiresPerYear } from '../../../hooks/useHiresPerYear'
import { useEmployeesPerYear } from '../../../hooks/useEmployeesPerYear'
import { useEmployeesByOrgUnit } from '../../../hooks/useEmployeesByOrgUnit'
import HiresPerYearChart from './components/charts/HiresPerYearChart'
import EmployeesPerYearChart from './components/charts/EmployeesPerYearChart'
import EmployeesByOrgUnitChart from './components/charts/EmployeesByOrgUnitChart'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { exportTableToExcel, exportTableToPdf } from '../../../utils/exportUtils'

const { Title, Text } = Typography

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
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Get data from custom hooks
  const {
    count: employeeCount,
    diffYoY: employeeCountDiffYoY,
    loading: employeeLoading
  } = useEmployeeCount(accessToken)
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

  // Combine loading states for simplicity
  const loading =
    employeeLoading ||
    hiresLoading ||
    turnoverLoading ||
    salaryLoading ||
    employeesYearlyLoading ||
    hiresYearlyLoading ||
    employeesByOrgUnitLoading

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

  const handleExport = async (
    format: 'excel' | 'pdf',
    tableName: string,
    title: string,
    columns: { key: string; header: string }[],
    data: TableDataRow[]
  ) => {
    setExportingTable(`${tableName}-${format}`)
    try {
      const rows = data.map(row => ({ ...row })) as Record<string, unknown>[]
      if (format === 'excel') {
        await exportTableToExcel(title, columns, rows)
      } else {
        await exportTableToPdf(title, columns, rows)
      }
    } finally {
      setExportingTable(null)
    }
  }

  const handleChartClick = (chartId: string) => {
    setSelectedChart(selectedChart === chartId ? null : chartId)
    if (selectedChart !== chartId && tableRef.current) {
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      }, 100)
    }
  }

  const chartConfigs = [
    {
      title: t('hr-analytics-employees-per-year'),
      testId: 'employees-per-year-chart',
      tag: t('hr-analytics-total-data-points', { count: employeesYearlyData.length }),
      description: t('hr-analytics-employees-per-year-description'),
      tableData: transformEmployeesPerYearData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change') }
      ]
    },
    {
      title: t('hr-analytics-hires-per-year'),
      testId: 'hires-per-year-chart',
      tag: t('hr-analytics-total-data-points', { count: hiresData.length }),
      description: t('hr-analytics-hires-per-year-description'),
      tableData: transformHiresPerYearData(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change') }
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
        { key: 'percentage', header: t('hr-analytics-percentage') }
      ]
    }
  ]
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="hr-analytics-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="gba:w-full" data-testid="hr-analytics-dashboard">
      <div className="gba:p-6 gba:pb-0">
        <div className="gba:mb-6">
          <Title level={2} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-dashboard-title')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-dashboard-subtitle')}</Text>
        </div>

        {/* KPI Cards Section - Using SectionKpiCards component */}
        <div className="gba:mb-8" data-testid="dashboard-kpi-cards">
          <SectionKpiCards cards={kpiCards} />
        </div>

        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-workforce-charts')}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          <Card
            data-testid="employees-per-year-chart-container"
            className={`gba:col-span-1 gba:cursor-pointer gba:transition-all gba:duration-200 ${
              selectedChart === 'employees-per-year-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('employees-per-year-chart')}
          >
            <CardContent className="gba:p-4">
              <EmployeesPerYearChart
                data={employeesYearlyData}
                loading={employeesYearlyLoading}
                error={employeesYearlyError}
              />
              {selectedChart === 'employees-per-year-chart' && (
                <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
              )}
            </CardContent>
          </Card>

          <Card
            data-testid="hires-per-year-chart-container"
            className={`gba:col-span-1 gba:cursor-pointer gba:transition-all gba:duration-200 ${
              selectedChart === 'hires-per-year-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('hires-per-year-chart')}
          >
            <CardContent className="gba:p-4">
              <HiresPerYearChart data={hiresData} loading={hiresYearlyLoading} error={hiresYearlyError} />
              {selectedChart === 'hires-per-year-chart' && (
                <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
              )}
            </CardContent>
          </Card>

          <Card
            data-testid="employees-by-org-unit-chart-container"
            className={`gba:col-span-1 gba:md:col-span-2 gba:cursor-pointer gba:transition-all gba:duration-200 ${
              selectedChart === 'employees-by-org-unit-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('employees-by-org-unit-chart')}
          >
            <CardContent className="gba:p-4">
              <EmployeesByOrgUnitChart accessToken={accessToken} />
              {selectedChart === 'employees-by-org-unit-chart' && (
                <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
              )}
              {employeesByOrgUnitError && (
                <p className="gba:text-xs gba:text-destructive gba:mt-2">
                  {String(employeesByOrgUnitError.message || employeesByOrgUnitError)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div ref={tableRef}>
          {selectedConfig && (
            <Card data-testid={`${selectedConfig.testId}-table`} className="gba:mt-6">
              <CardHeader>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <CardTitle className="gba:text-xl">
                      {t('hr-analytics-data-table', { title: selectedConfig.title })}
                    </CardTitle>
                    <Badge variant="outline" className="gba:bg-success-secondary gba:text-success-secondary-foreground">
                      {t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
                    </Badge>
                  </div>
                  <div className="gba:flex gba:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`dashboard-${selectedConfig.testId}-export-excel`}
                      disabled={exportingTable === `${selectedConfig.testId}-excel`}
                      onClick={e => {
                        e.stopPropagation()
                        handleExport(
                          'excel',
                          selectedConfig.testId,
                          selectedConfig.title,
                          selectedConfig.exportColumns,
                          selectedConfig.tableData
                        )
                      }}
                      className="gba:flex gba:items-center gba:gap-1"
                    >
                      <PiFileText className="gba:w-3 gba:h-3" />
                      {t('common-export-excel')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`dashboard-${selectedConfig.testId}-export-pdf`}
                      disabled={exportingTable === `${selectedConfig.testId}-pdf`}
                      onClick={e => {
                        e.stopPropagation()
                        handleExport(
                          'pdf',
                          selectedConfig.testId,
                          selectedConfig.title,
                          selectedConfig.exportColumns,
                          selectedConfig.tableData
                        )
                      }}
                      className="gba:flex gba:items-center gba:gap-1"
                    >
                      <PiFilePdf className="gba:w-3 gba:h-3" />
                      {t('common-export-pdf')}
                    </Button>
                  </div>
                </div>
                <Text className="gba:text-muted-foreground gba:text-sm">{selectedConfig.description}</Text>
              </CardHeader>
              <CardContent>
                <div className="gba:max-h-96 gba:overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedConfig.exportColumns.map(col => (
                          <TableHead key={col.key}>{col.header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedConfig.tableData.map((row, index) => (
                        <TableRow key={`${selectedConfig.testId}-${index}`}>
                          {selectedConfig.exportColumns.map(col => (
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
      </div>
    </div>
  )
}

export default Dashboard
