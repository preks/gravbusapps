import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmploymentTypeDistribution } from '../../../../../hooks/useEmploymentTypeDistribution'
import { useFteRatio } from '../../../../../hooks/useFteRatio'
import { useGapRate } from '../../../../../hooks/useGapRate'
import { useProbationRate } from '../../../../../hooks/useProbationRate'
import { useAverageTenure } from '../../../../../hooks/useAverageTenure'
import { useTenureByOrgUnit } from '../../../../../hooks/useTenureByOrgUnit'
import { useContractTypeDistribution } from '../../../../../hooks/useContractTypeDistribution'
import { useGapRateByOrgUnit } from '../../../../../hooks/useGapRateByOrgUnit'
import { useProbationRateByOrgUnit } from '../../../../../hooks/useProbationRateByOrgUnit'
import EmploymentStatistics from '../components/EmploymentStatistics'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../../../hooks/useChartTableSelection'
import TenureHeatmapChart from '../charts/TenureHeatmapChart'
import EmploymentTypePieChart from '../charts/EmploymentTypePieChart'
import ContractTypePieChart from '../charts/ContractTypePieChart'
import GapRateByOrgUnitChart from '../charts/GapRateByOrgUnitChart'
import ProbationRateByOrgUnitChart from '../charts/ProbationRateByOrgUnitChart'
import type { AnalyticsTableData } from '../../../../shared/analyticsTabTypes'
import { HIGHLIGHT_BADGE } from '../../../../shared/AnalyticsDataTable'
import AnalyticsTabErrorCard from '../../../../shared/AnalyticsTabErrorCard'
import AnalyticsTableSection from '../../../../shared/AnalyticsTableSection'
import SelectableChartTile from '../../../../shared/SelectableChartTile'
import { renderPeriodValueCell } from '../../../../shared/analyticsTableRenderers'

/**
 * Employment tab component displaying key employment metrics and distributions
 */
const Employment: React.FC<BusinessAppContextProps> = context => {
  const prefixDataTestId = 'Employment'
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  // Get the current active structure ID
  const structureId = getCurrentActiveStructureId()

  // Get employment type distribution data
  const {
    distribution: employmentTypeDistribution,
    loading: empTypeLoading,
    error: empTypeError
  } = useEmploymentTypeDistribution(context.accessToken)

  // Get contract type distribution data
  const { distribution: contractTypeDistribution } = useContractTypeDistribution(context.accessToken)

  // Get FTE to Employee ratio data
  const { totalFte, employeeCount, ratio, loading: fteLoading, error: fteError } = useFteRatio(context.accessToken)

  // Get Gap Rate data
  const {
    gapRate,
    vacantPositions,
    totalPositions,
    loading: gapRateLoading,
    error: gapRateError
  } = useGapRate(context.accessToken)

  // Get Gap Rate by Org Unit data
  const { data: gapRateByOrgUnit } = useGapRateByOrgUnit(context.accessToken)

  // Get Probation Rate data
  const {
    probationRate,
    employeesInProbation,
    totalEmployees,
    loading: probationRateLoading,
    error: probationRateError
  } = useProbationRate(context.accessToken)

  // Get Probation Rate by Org Unit data
  const { data: probationRateByOrgUnit } = useProbationRateByOrgUnit(context.accessToken)

  // Get Average Tenure data
  const { formattedTenure, loading: tenureLoading, error: tenureError } = useAverageTenure(context.accessToken)

  // Get Tenure by Organizational Unit data for heatmap
  const {
    tenureDistribution,
    orgUnits,
    tenureRanges,
    loading: tenureDistributionLoading,
    error: tenureDistributionError
  } = useTenureByOrgUnit(context, structureId ?? undefined)

  // Transform data functions for tables
  const transformEmploymentTypeData = (): AnalyticsTableData[] => {
    return employmentTypeDistribution.map(item => ({
      period: item.name,
      value: item.count
    }))
  }

  const transformContractTypeData = (): AnalyticsTableData[] => {
    return contractTypeDistribution.map(item => ({
      period: item.name,
      value: item.count
    }))
  }

  const transformGapRateByOrgUnitData = (): AnalyticsTableData[] => {
    return gapRateByOrgUnit.map((item: any) => ({
      period: item.name,
      value: `${item.gapRate.toFixed(1)}%`
    }))
  }

  const transformProbationRateByOrgUnitData = (): AnalyticsTableData[] => {
    return probationRateByOrgUnit.map((item: any) => ({
      period: item.name,
      value: `${item.probationRate.toFixed(1)}%`
    }))
  }

  const transformTenureHeatmapData = (): AnalyticsTableData[] => {
    return tenureDistribution.map(item => ({
      period: `${item.orgUnitName} - ${tenureRanges.find(r => r.id === item.tenureRangeId)?.label || 'Unknown'}`,
      value: item.count
    }))
  }

  const exportColumnsPeriodValue = [
    { key: 'period', header: t('hr-analytics-period') },
    { key: 'value', header: t('hr-analytics-value') }
  ]
  const exportColumnsPeriodValuePercentage = [
    { key: 'period', header: t('hr-analytics-period') },
    { key: 'value', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE }
  ]

  // Chart configurations
  const chartConfigs = [
    {
      title: t('hr-analytics-employment-type-distribution'),
      data: employmentTypeDistribution,
      tableData: transformEmploymentTypeData(),
      testId: 'employment-type-chart',
      tag: t('hr-analytics-types', { count: employmentTypeDistribution.length }),
      description: t('hr-analytics-employment-type-description'),
      exportColumns: exportColumnsPeriodValue
    },
    {
      title: t('hr-analytics-contract-type-distribution'),
      data: contractTypeDistribution,
      tableData: transformContractTypeData(),
      testId: 'contract-type-chart',
      tag: t('hr-analytics-contract-breakdown'),
      description: t('hr-analytics-contract-types-description'),
      exportColumns: exportColumnsPeriodValue
    },
    {
      title: t('hr-analytics-gap-rate-by-organizational-unit'),
      data: gapRateByOrgUnit,
      tableData: transformGapRateByOrgUnitData(),
      testId: 'gap-rate-org-unit-chart',
      tag: t('hr-analytics-position-gaps'),
      description: t('hr-analytics-gap-rate-description'),
      exportColumns: exportColumnsPeriodValuePercentage
    },
    {
      title: t('hr-analytics-probation-rate-by-organizational-unit'),
      data: probationRateByOrgUnit,
      tableData: transformProbationRateByOrgUnitData(),
      testId: 'probation-rate-org-unit-chart',
      tag: t('hr-analytics-probation-status'),
      description: t('hr-analytics-probation-rate-description'),
      exportColumns: exportColumnsPeriodValuePercentage
    },
    {
      title: t('hr-analytics-tenure-distribution-by-organizational-unit'),
      data: tenureDistribution,
      tableData: transformTenureHeatmapData(),
      testId: 'tenure-heatmap-chart',
      tag: t('hr-analytics-data-points', { count: tenureDistribution.length }),
      description: t('hr-analytics-tenure-chart-description'),
      exportColumns: exportColumnsPeriodValue
    }
  ]

  // Determine overall loading and error states
  const isLoading = fteLoading || gapRateLoading || probationRateLoading || tenureLoading
  const hasError = fteError || gapRateError || probationRateError || tenureError

  // Prepare statistics for SectionKpiCards
  const statistics = {
    totalFte: totalFte || 0,
    employeeCount: employeeCount || 0,
    fteRatio: ratio || 0,
    averageTenure: formattedTenure || 'N/A',
    gapRate: gapRate || 0,
    vacantPositions: vacantPositions || 0,
    totalPositions: totalPositions || 0,
    probationRate: probationRate || 0,
    employeesInProbation: employeesInProbation || 0,
    totalEmployees: totalEmployees || 0
  }

  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (hasError) {
    return (
      <AnalyticsTabErrorCard
        dataTestId={`${prefixDataTestId}-tab`}
        message={t('hr-analytics-employment-error')}
        retryLabel={t('common-retry')}
        onRetry={() => globalThis.location.reload()}
        variant="centered"
      />
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-tab`}>
      {/* Statistics Overview */}
      <EmploymentStatistics statistics={statistics} isLoading={isLoading} dataTestId="employment" />

      {/* Charts Section */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-employment-analysis')}</h3>
        <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-employment-analysis-description')}</p>
      </div>

      {/* Charts Grid */}
      <div className="gba:space-y-6 gba:mt-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <SelectableChartTile
            testId="employment-type-chart"
            isSelected={selectedChart === 'employment-type-chart'}
            onSelect={() => handleChartClick('employment-type-chart')}
            selectedLabel={t('common-selected')}
          >
            <EmploymentTypePieChart data={employmentTypeDistribution} loading={empTypeLoading} error={empTypeError} />
          </SelectableChartTile>
          <SelectableChartTile
            testId="contract-type-chart"
            isSelected={selectedChart === 'contract-type-chart'}
            onSelect={() => handleChartClick('contract-type-chart')}
            selectedLabel={t('common-selected')}
          >
            <ContractTypePieChart accessToken={context.accessToken} />
          </SelectableChartTile>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <SelectableChartTile
            testId="gap-rate-org-unit-chart"
            isSelected={selectedChart === 'gap-rate-org-unit-chart'}
            onSelect={() => handleChartClick('gap-rate-org-unit-chart')}
            selectedLabel={t('common-selected')}
          >
            <GapRateByOrgUnitChart accessToken={context.accessToken} />
          </SelectableChartTile>
          <SelectableChartTile
            testId="probation-rate-org-unit-chart"
            isSelected={selectedChart === 'probation-rate-org-unit-chart'}
            onSelect={() => handleChartClick('probation-rate-org-unit-chart')}
            selectedLabel={t('common-selected')}
          >
            <ProbationRateByOrgUnitChart accessToken={context.accessToken} />
          </SelectableChartTile>
        </div>

        <div className="gba:w-full">
          <SelectableChartTile
            testId="tenure-heatmap-chart"
            isSelected={selectedChart === 'tenure-heatmap-chart'}
            onSelect={() => handleChartClick('tenure-heatmap-chart')}
            selectedLabel={t('common-selected')}
          >
            <TenureHeatmapChart
              data={tenureDistribution}
              orgUnits={orgUnits}
              tenureRanges={tenureRanges}
              loading={tenureDistributionLoading}
              error={tenureDistributionError}
            />
          </SelectableChartTile>
        </div>
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
        renderCell={(item, col) => renderPeriodValueCell(item, col)}
        footer={
          selectedConfig ? (
            <div className="gba:mt-4 gba:pt-4 gba:border-t gba:bg-muted gba:rounded gba:p-3">
              <div className="gba:flex gba:justify-between gba:text-sm">
                <span className="gba:text-muted-foreground">
                  {t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
                </span>
                <span className="gba:text-muted-foreground">
                  {t('hr-analytics-total-label')}{' '}
                  {selectedConfig.testId.includes('rate')
                    ? t('hr-analytics-total-average')
                    : t('hr-analytics-total-count')}
                  :{' '}
                  {selectedConfig.testId.includes('rate')
                    ? `${(
                        selectedConfig.tableData.reduce((sum, item) => {
                          const numValue =
                            typeof item.value === 'string' ? parseFloat(item.value.replace('%', '')) : item.value
                          return sum + (isNaN(numValue) ? 0 : numValue)
                        }, 0) / selectedConfig.tableData.length
                      ).toFixed(1)}%`
                    : selectedConfig.tableData
                        .reduce((sum, item) => {
                          const numValue = typeof item.value === 'number' ? item.value : 0
                          return sum + numValue
                        }, 0)
                        .toLocaleString()}
                </span>
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  )
}

export default Employment
