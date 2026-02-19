import React, { useState, useRef } from 'react'
import { Card, CardContent, useTranslation } from '@newwork/nw-design-system'
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
import { exportTableToExcel, exportTableToPdf } from '../../../../../utils/exportUtils'
import TenureHeatmapChart from '../charts/TenureHeatmapChart'
import EmploymentTypePieChart from '../charts/EmploymentTypePieChart'
import ContractTypePieChart from '../charts/ContractTypePieChart'
import GapRateByOrgUnitChart from '../charts/GapRateByOrgUnitChart'
import ProbationRateByOrgUnitChart from '../charts/ProbationRateByOrgUnitChart'
import AnalyticsDataTable from '../../../../shared/AnalyticsDataTable'

interface TableData {
  period: string
  value: number | string
  change?: number
}

/**
 * Employment tab component displaying key employment metrics and distributions
 */
const Employment: React.FC<BusinessAppContextProps> = context => {
  const prefixDataTestId = 'Employment'
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(hrTranslations)

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
  const transformEmploymentTypeData = (): TableData[] => {
    return employmentTypeDistribution.map(item => ({
      period: item.name,
      value: item.count
    }))
  }

  const transformContractTypeData = (): TableData[] => {
    return contractTypeDistribution.map(item => ({
      period: item.name,
      value: item.count
    }))
  }

  const transformGapRateByOrgUnitData = (): TableData[] => {
    return gapRateByOrgUnit.map((item: any) => ({
      period: item.name,
      value: `${item.gapRate.toFixed(1)}%`
    }))
  }

  const transformProbationRateByOrgUnitData = (): TableData[] => {
    return probationRateByOrgUnit.map((item: any) => ({
      period: item.name,
      value: `${item.probationRate.toFixed(1)}%`
    }))
  }

  const transformTenureHeatmapData = (): TableData[] => {
    return tenureDistribution.map(item => ({
      period: `${item.orgUnitName} - ${tenureRanges.find(r => r.id === item.tenureRangeId)?.label || 'Unknown'}`,
      value: item.count
    }))
  }

  const exportColumnsPeriodValue = [
    { key: 'period', header: t('hr-analytics-period') },
    { key: 'value', header: t('hr-analytics-value') }
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
      exportColumns: exportColumnsPeriodValue
    },
    {
      title: t('hr-analytics-probation-rate-by-organizational-unit'),
      data: probationRateByOrgUnit,
      tableData: transformProbationRateByOrgUnitData(),
      testId: 'probation-rate-org-unit-chart',
      tag: t('hr-analytics-probation-status'),
      description: t('hr-analytics-probation-rate-description'),
      exportColumns: exportColumnsPeriodValue
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

  const handleExport = async (
    format: 'excel' | 'pdf',
    tableName: string,
    title: string,
    columns: { key: string; header: string }[],
    data: TableData[]
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

    // Smooth scroll to table after a brief delay to allow state update
    if (selectedChart !== chartId && tableRef.current) {
      setTimeout(() => {
        tableRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }, 100)
    }
  }

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

  // Find the selected chart configuration
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)
  const resolveExportingFormat = (tableName: string): 'excel' | 'pdf' | null => {
    if (exportingTable === `${tableName}-excel`) return 'excel'
    if (exportingTable === `${tableName}-pdf`) return 'pdf'
    return null
  }

  // Handle error state
  if (hasError) {
    return (
      <div data-testid={`${prefixDataTestId}-tab`} className="gba:p-4">
        <Card className="gba:border-destructive-secondary">
          <CardContent className="gba:p-6">
            <div className="gba:text-center">
              <p className="gba:text-destructive gba:mb-4">{t('hr-analytics-employment-error')}</p>
              <button
                onClick={() => window.location.reload()}
                className="gba:px-4 gba:py-2 gba:bg-destructive gba:text-primary-foreground gba:rounded gba:hover:bg-destructive"
              >
                {t('common-retry')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
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
        {/* Top Row: Employment Type and Contract Type */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          {/* Employment Type Distribution */}
          <div
            data-testid="employment-type-chart-card"
            className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-lg ${
              selectedChart === 'employment-type-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('employment-type-chart')}
          >
            <EmploymentTypePieChart data={employmentTypeDistribution} loading={empTypeLoading} error={empTypeError} />
            {selectedChart === 'employment-type-chart' && (
              <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-info-secondary gba:text-info-secondary-foreground gba:px-2 gba:py-1 gba:rounded gba:text-xs">
                ✓ {t('common-selected')}
              </div>
            )}
          </div>

          {/* Contract Type Distribution */}
          <div
            data-testid="contract-type-chart-card"
            className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-lg ${
              selectedChart === 'contract-type-chart' ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('contract-type-chart')}
          >
            <ContractTypePieChart accessToken={context.accessToken} />
            {selectedChart === 'contract-type-chart' && (
              <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-info-secondary gba:text-info-secondary-foreground gba:px-2 gba:py-1 gba:rounded gba:text-xs">
                ✓ {t('common-selected')}
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Gap Rate and Probation Rate by Organizational Unit */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          {/* Gap Rate by Organizational Unit */}
          <div
            data-testid="gap-rate-org-unit-chart-card"
            className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-lg ${
              selectedChart === 'gap-rate-org-unit-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('gap-rate-org-unit-chart')}
          >
            <GapRateByOrgUnitChart accessToken={context.accessToken} />
            {selectedChart === 'gap-rate-org-unit-chart' && (
              <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-info-secondary gba:text-info-secondary-foreground gba:px-2 gba:py-1 gba:rounded gba:text-xs">
                ✓ {t('common-selected')}
              </div>
            )}
          </div>

          {/* Probation Rate by Organizational Unit */}
          <div
            data-testid="probation-rate-org-unit-chart-card"
            className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-lg ${
              selectedChart === 'probation-rate-org-unit-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('probation-rate-org-unit-chart')}
          >
            <ProbationRateByOrgUnitChart accessToken={context.accessToken} />
            {selectedChart === 'probation-rate-org-unit-chart' && (
              <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-info-secondary gba:text-info-secondary-foreground gba:px-2 gba:py-1 gba:rounded gba:text-xs">
                ✓ {t('common-selected')}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Tenure Distribution by Organizational Unit (Full Width) */}
        <div className="gba:w-full">
          <div
            data-testid="tenure-heatmap-chart-card"
            className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-lg ${
              selectedChart === 'tenure-heatmap-chart'
                ? 'gba:ring-2 gba:ring-info gba:shadow-lg'
                : 'gba:hover:shadow-lg'
            }`}
            onClick={() => handleChartClick('tenure-heatmap-chart')}
          >
            <TenureHeatmapChart
              data={tenureDistribution}
              orgUnits={orgUnits}
              tenureRanges={tenureRanges}
              loading={tenureDistributionLoading}
              error={tenureDistributionError}
            />
            {selectedChart === 'tenure-heatmap-chart' && (
              <div className="gba:absolute gba:top-2 gba:right-2 gba:bg-info-secondary gba:text-info-secondary-foreground gba:px-2 gba:py-1 gba:rounded gba:text-xs">
                ✓ {t('common-selected')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Data Table */}
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
            exportExcelLabel={t('common-export-excel')}
            exportPdfLabel={t('common-export-pdf')}
            onExport={format =>
              handleExport(
                format,
                selectedConfig.testId,
                selectedConfig.title,
                selectedConfig.exportColumns,
                selectedConfig.tableData
              )
            }
            getRowKey={(_, index) => `${selectedConfig.testId}-${index}`}
            renderCell={(item, col) => {
              if (col.key === 'period') return <span className="gba:font-medium">{item.period}</span>
              return typeof item.value === 'number' ? item.value.toLocaleString() : item.value
            }}
            footer={
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
            }
          />
        )}

        {!selectedConfig && (
          <div className="gba:text-center gba:py-8">
            <p className="gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Employment
