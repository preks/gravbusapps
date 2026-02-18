import React, { useMemo, useRef, useState } from 'react'
import { Typography, Row, Col } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  SectionKpiCards,
  KpiCardData,
  Icon,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@newwork/nw-design-system'
import { CalendarIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { PiFilePdf, PiFileText } from 'react-icons/pi'
import { useCompensationMetrics } from '../../../hooks/useCompensationMetrics'
import { useSalaryByOrgUnit } from '../../../hooks/useSalaryByOrgUnit'
import { useHealthInsuranceDistribution } from '../../../hooks/useHealthInsuranceDistribution'
import { useHealthInsuranceTypeDistribution } from '../../../hooks/useHealthInsuranceTypeDistribution'
import YearlyPayrollChart from './components/charts/YearlyPayrollChart'
import SalaryByOrgUnitChart from './components/charts/SalaryByOrgUnitChart'
import HealthInsurerDistributionChart from './components/charts/HealthInsurerDistributionChart'
import HealthInsuranceTypeDistributionChart from './components/charts/HealthInsuranceTypeDistributionChart'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { exportTableToExcel, exportTableToPdf } from '../../../utils/exportUtils'

const { Title, Text } = Typography

interface CompensationProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Compensation: React.FC<CompensationProps> = ({ accessToken, prefixDataTestId = 'Compensation' }) => {
  const { t } = useTranslation(hrTranslations)
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  // Use combined hook for compensation metrics (median, average salary, and merit increase)
  const {
    medianSalary,
    averageSalary,
    averageMeritIncrease,
    loading: salaryLoading,
    error: salaryError
  } = useCompensationMetrics(accessToken)
  const {
    salaryByOrgUnit,
    loading: salaryByOrgUnitLoading,
    error: salaryByOrgUnitError
  } = useSalaryByOrgUnit(accessToken)
  const {
    distribution: healthInsurerDistribution,
    loading: healthInsurerLoading,
    error: healthInsurerError
  } = useHealthInsuranceDistribution(accessToken)
  const {
    distribution: healthInsuranceTypeDistribution,
    loading: healthInsuranceTypeLoading,
    error: healthInsuranceTypeError
  } = useHealthInsuranceTypeDistribution(accessToken)

  // Combine loading states
  const loading = salaryLoading || salaryByOrgUnitLoading || healthInsurerLoading || healthInsuranceTypeLoading

  // Combine errors (show first one that occurs)
  const error = salaryError || salaryByOrgUnitError || healthInsurerError || healthInsuranceTypeError

  interface TableDataRow {
    period: string
    value: number | string
    percentage?: string
    growth?: string
    employeeCount?: number
  }

  const transformSalaryByOrgUnit = (): TableDataRow[] => {
    return salaryByOrgUnit.map(item => ({
      period: item.name,
      value: item.averageSalary,
      employeeCount: item.employeeCount
    }))
  }

  const transformHealthInsurer = (): TableDataRow[] => {
    return healthInsurerDistribution.map(item => ({
      period: item.name,
      value: item.count,
      percentage: `${item.percentage.toFixed(1)}%`
    }))
  }

  const transformHealthInsuranceType = (): TableDataRow[] => {
    return healthInsuranceTypeDistribution.map(item => ({
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
      title: t('hr-analytics-salary-by-org-unit'),
      testId: 'salary-by-org-unit-chart',
      description: t('hr-analytics-salary-by-org-unit-description'),
      tag: t('hr-analytics-departments', { count: salaryByOrgUnit.length }),
      tableData: transformSalaryByOrgUnit(),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'employeeCount', header: t('hr-analytics-employee-count') }
      ]
    },
    {
      title: t('hr-analytics-health-insurer-distribution'),
      testId: 'health-insurer-chart',
      description: t('hr-analytics-health-insurer-distribution-description'),
      tag: t('hr-analytics-health-insurers'),
      tableData: transformHealthInsurer(),
      exportColumns: [
        { key: 'period', header: t('common-category') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'percentage', header: t('hr-analytics-percentage') }
      ]
    },
    {
      title: t('hr-analytics-health-insurance-type-distribution'),
      testId: 'health-insurance-type-chart',
      description: t('hr-analytics-health-insurance-type-distribution-description'),
      tag: t('hr-analytics-insurance-types'),
      tableData: transformHealthInsuranceType(),
      exportColumns: [
        { key: 'period', header: t('common-category') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'percentage', header: t('hr-analytics-percentage') }
      ]
    }
  ]
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  // Format merit increases
  const meritIncreases = useMemo(
    () => ({
      value: averageMeritIncrease,
      label: 'Average increase'
    }),
    [averageMeritIncrease]
  )

  // Format average salary in thousands
  const formattedAverageSalary = useMemo(() => {
    return {
      value: Math.round(averageSalary / 1000), // Convert to thousands and round
      label: 'Annual average'
    }
  }, [averageSalary])

  // Format median salary in thousands
  const formattedMedianSalary = useMemo(() => {
    return {
      value: Math.round(medianSalary / 1000), // Convert to thousands and round
      label: 'Company median'
    }
  }, [medianSalary])

  // Create KPI cards data
  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'total-payroll',
        title: t('hr-analytics-total-payroll'),
        value: t('hr-analytics-coming-soon'),
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-1)',
        footer: t('hr-analytics-annual-payroll')
      },
      {
        id: 'median-salary',
        title: t('hr-analytics-median-salary'),
        value: loading ? t('hr-data-filter-loading') : `${formattedMedianSalary.value}K`,
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-2)',
        footer: t('hr-analytics-company-median')
      },
      {
        id: 'avg-salary',
        title: t('hr-analytics-avg-salary'),
        value: loading ? t('hr-data-filter-loading') : `${formattedAverageSalary.value}K`,
        icon: <Icon icon={CurrencyDollarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-3)',
        footer: t('hr-analytics-annual-average')
      },
      {
        id: 'merit-increases',
        title: t('hr-analytics-merit-increases'),
        value: loading ? t('hr-data-filter-loading') : `${meritIncreases.value}%`,
        icon: <Icon icon={CalendarIcon} size="sm" decorative />,
        iconColor: 'var(--nw-chart-4)',
        footer: t('hr-analytics-average-increase')
      }
    ],
    [loading, formattedMedianSalary, formattedAverageSalary, meritIncreases, t]
  )

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-Error`} className="gba:p-6">
        <div className="gba:bg-destructive-secondary gba:border gba:border-destructive-secondary gba:rounded-lg gba:p-4">
          <h3 className="gba:text-destructive-secondary-foreground gba:font-medium">Error Loading Compensation Data</h3>
          <p className="gba:text-destructive-secondary-foreground gba:mt-2">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:flex gba:flex-col gba:gap-6 gba:p-6 gba:bg-muted gba:min-h-full gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={3} className="gba:m-0 gba:text-foreground">
            {t('hr-analytics-compensation-analysis')}
          </Title>
          <Text className="gba:text-muted-foreground">{t('hr-analytics-compensation-description')}</Text>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-cards`}>
        <SectionKpiCards cards={kpiCards} />
      </div>

      {/* Yearly Payroll Chart */}
      <YearlyPayrollChart showComingSoon={true} />

      <div className="gba:mb-2">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-workforce-charts')}</h3>
        <Text className="gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</Text>
      </div>

      <Card
        data-testid={`${prefixDataTestId}-salary-by-org-unit-card`}
        className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
          selectedChart === 'salary-by-org-unit-chart'
            ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
            : 'gba:hover:shadow-lg'
        }`}
        onClick={() => handleChartClick('salary-by-org-unit-chart')}
      >
        <CardContent className="gba:p-4">
          <SalaryByOrgUnitChart data={salaryByOrgUnit} loading={salaryByOrgUnitLoading} error={salaryByOrgUnitError} />
          {selectedChart === 'salary-by-org-unit-chart' && (
            <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
          )}
        </CardContent>
      </Card>

      <div className="gba:mt-4">
        <Row gutter={16} className="gba:w-full">
          <Col span={12}>
            <Card
              data-testid={`${prefixDataTestId}-health-insurer-card`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
                selectedChart === 'health-insurer-chart'
                  ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                  : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick('health-insurer-chart')}
            >
              <CardContent className="gba:p-4">
                <HealthInsurerDistributionChart accessToken={accessToken} />
                {selectedChart === 'health-insurer-chart' && (
                  <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
                )}
              </CardContent>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              data-testid={`${prefixDataTestId}-health-insurance-type-card`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${
                selectedChart === 'health-insurance-type-chart'
                  ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                  : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick('health-insurance-type-chart')}
            >
              <CardContent className="gba:p-4">
                <HealthInsuranceTypeDistributionChart accessToken={accessToken} />
                {selectedChart === 'health-insurance-type-chart' && (
                  <p className="gba:text-xs gba:text-info gba:mt-2">✓ {t('common-selected')}</p>
                )}
              </CardContent>
            </Card>
          </Col>
        </Row>
      </div>

      <div ref={tableRef}>
        {selectedConfig && (
          <Card data-testid={`${prefixDataTestId}-${selectedConfig.testId}-table`} className="gba:mt-4">
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
                    data-testid={`${prefixDataTestId}-${selectedConfig.testId}-export-excel`}
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
                    data-testid={`${prefixDataTestId}-${selectedConfig.testId}-export-pdf`}
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
              <Text className="gba:text-muted-foreground">{selectedConfig.description}</Text>
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
                            {String((row as unknown as Record<string, unknown>)[col.key] ?? '-')}
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
  )
}

export default Compensation
