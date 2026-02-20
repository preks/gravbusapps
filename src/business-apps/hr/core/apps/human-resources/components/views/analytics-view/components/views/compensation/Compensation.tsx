import React, { useMemo } from 'react'
import { Typography, Row, Col } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SectionKpiCards, KpiCardData, Icon, Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { CalendarIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { useCompensationMetrics } from '../../../hooks/useCompensationMetrics'
import { useSalaryByOrgUnit } from '../../../hooks/useSalaryByOrgUnit'
import { useHealthInsuranceDistribution } from '../../../hooks/useHealthInsuranceDistribution'
import { useHealthInsuranceTypeDistribution } from '../../../hooks/useHealthInsuranceTypeDistribution'
import YearlyPayrollChart from './components/charts/YearlyPayrollChart'
import SalaryByOrgUnitChart from './components/charts/SalaryByOrgUnitChart'
import HealthInsurerDistributionChart from './components/charts/HealthInsurerDistributionChart'
import HealthInsuranceTypeDistributionChart from './components/charts/HealthInsuranceTypeDistributionChart'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../hooks/useChartTableSelection'
import { HIGHLIGHT_BADGE } from '../../shared/AnalyticsDataTable'
import AnalyticsTabErrorCard from '../../shared/AnalyticsTabErrorCard'
import AnalyticsTableSection from '../../shared/AnalyticsTableSection'

const { Title, Text } = Typography

interface CompensationProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Compensation: React.FC<CompensationProps> = ({ accessToken, prefixDataTestId = 'Compensation' }) => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()
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
        { key: 'percentage', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE }
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
        { key: 'percentage', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE }
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
      <AnalyticsTabErrorCard
        dataTestId={`${prefixDataTestId}-Error`}
        message={t('hr-analytics-compensation-error')}
        detail={error instanceof Error ? error.message : String(error)}
        retryLabel={t('common-retry')}
        onRetry={() => window.location.reload()}
        variant="row"
        className="gba:p-6"
      />
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

      <AnalyticsTableSection<TableDataRow>
        tableRef={tableRef}
        selectedConfig={selectedConfig}
        resolveExportingFormat={resolveExportingFormat}
        handleExport={handleExport}
        exportExcelLabel={t('common-export-excel')}
        exportPdfLabel={t('common-export-pdf')}
        exportExcelTestId={selectedConfig ? `${prefixDataTestId}-${selectedConfig.testId}-export-excel` : undefined}
        exportPdfTestId={selectedConfig ? `${prefixDataTestId}-${selectedConfig.testId}-export-pdf` : undefined}
        tableTitle={selectedConfig ? t('hr-analytics-data-table', { title: selectedConfig.title }) : ''}
        entriesText={selectedConfig ? t('hr-analytics-total-entries', { count: selectedConfig.tableData.length }) : ''}
        clickToViewMessage={t('hr-analytics-click-to-view-table')}
      />
    </div>
  )
}

export default Compensation
