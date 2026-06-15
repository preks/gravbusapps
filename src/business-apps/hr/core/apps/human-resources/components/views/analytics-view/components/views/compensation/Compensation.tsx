import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Icon, KpiCardData, SectionKpiCards, useTranslation } from '@newwork/nw-design-system'
import { CurrencyDollarIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useAnalyticsTableExport } from '../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../hooks/useChartTableSelection'
import { useHealthInsuranceDistribution } from '../../../hooks/useHealthInsuranceDistribution'
import { useHealthInsuranceTypeDistribution } from '../../../hooks/useHealthInsuranceTypeDistribution'
import { useSalaryByOrgUnit } from '../../../hooks/useSalaryByOrgUnit'
import { HIGHLIGHT_BADGE } from '../../shared/AnalyticsDataTable'
import AnalyticsTabErrorCard from '../../shared/AnalyticsTabErrorCard'
import AnalyticsTableSection from '../../shared/AnalyticsTableSection'
import AnalyticsTabLoadingState from '../../shared/AnalyticsTabLoadingState'
import SelectableChartCard from '../../shared/SelectableChartCard'
import HealthInsuranceTypeDistributionChart from './components/charts/HealthInsuranceTypeDistributionChart'
import HealthInsurerDistributionChart from './components/charts/HealthInsurerDistributionChart'
import SalaryByOrgUnitChart from './components/charts/SalaryByOrgUnitChart'
import YearlyPayrollChart from './components/charts/YearlyPayrollChart'

interface CompensationProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Compensation: React.FC<CompensationProps> = ({ accessToken, prefixDataTestId = 'Compensation' }) => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()
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
  const loading = salaryByOrgUnitLoading || healthInsurerLoading || healthInsuranceTypeLoading

  // Combine errors (show first one that occurs)
  const error = salaryByOrgUnitError || healthInsurerError || healthInsuranceTypeError

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
      }
    ],
    [loading, t]
  )

  if (loading) {
    return (
      <AnalyticsTabLoadingState
        dataTestId={`${prefixDataTestId}-loading`}
        message={t('hr-data-filter-loading-data')}
        className="gba:min-h-[300px]"
      />
    )
  }

  if (error) {
    return (
      <AnalyticsTabErrorCard
        dataTestId={`${prefixDataTestId}-Error`}
        message={t('hr-analytics-compensation-error')}
        detail={error.message}
        retryLabel={t('common-retry')}
        onRetry={() => globalThis.location.reload()}
        variant="row"
        className="gba:p-6"
      />
    )
  }

  return (
    <div
      data-testid={prefixDataTestId}
      className="gba:flex gba:flex-col gba:gap-6 gba:p-6 gba:min-h-full gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h3 className="gba:m-0 gba:text-xl gba:font-semibold gba:text-foreground">
            {t('hr-analytics-compensation-analysis')}
          </h3>
          <p className="gba:text-muted-foreground">{t('hr-analytics-compensation-description')}</p>
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
        <p className="gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
      </div>

      <SelectableChartCard
        testId="salary-by-org-unit-chart"
        isSelected={selectedChart === 'salary-by-org-unit-chart'}
        onSelect={() => handleChartClick('salary-by-org-unit-chart')}
        title={chartConfigs[0].title}
        tag={chartConfigs[0].tag}
        description={chartConfigs[0].description}
        selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
      >
        <SalaryByOrgUnitChart data={salaryByOrgUnit} loading={salaryByOrgUnitLoading} error={salaryByOrgUnitError} />
      </SelectableChartCard>

      <div className="gba:mt-4">
        <div className="gba:grid gba:w-full gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2">
          <div>
            <SelectableChartCard
              testId="health-insurer-chart"
              isSelected={selectedChart === 'health-insurer-chart'}
              onSelect={() => handleChartClick('health-insurer-chart')}
              title={chartConfigs[1].title}
              tag={chartConfigs[1].tag}
              description={chartConfigs[1].description}
              selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
            >
              <HealthInsurerDistributionChart accessToken={accessToken} />
            </SelectableChartCard>
          </div>
          <div>
            <SelectableChartCard
              testId="health-insurance-type-chart"
              isSelected={selectedChart === 'health-insurance-type-chart'}
              onSelect={() => handleChartClick('health-insurance-type-chart')}
              title={chartConfigs[2].title}
              tag={chartConfigs[2].tag}
              description={chartConfigs[2].description}
              selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
            >
              <HealthInsuranceTypeDistributionChart accessToken={accessToken} />
            </SelectableChartCard>
          </div>
        </div>
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
