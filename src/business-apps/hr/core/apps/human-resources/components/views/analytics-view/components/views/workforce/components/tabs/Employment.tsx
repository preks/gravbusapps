import React, { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiFileText, PiFilePdf } from 'react-icons/pi'
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
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import TenureHeatmapChart from '../charts/TenureHeatmapChart'
import EmploymentTypePieChart from '../charts/EmploymentTypePieChart'
import ContractTypePieChart from '../charts/ContractTypePieChart'
import GapRateByOrgUnitChart from '../charts/GapRateByOrgUnitChart'
import ProbationRateByOrgUnitChart from '../charts/ProbationRateByOrgUnitChart'

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

  // Get the current active structure ID (with fallback)
  const structureId = getCurrentActiveStructureId() ?? '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'

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
  } = useTenureByOrgUnit(context, structureId)

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

  // Chart configurations
  const chartConfigs = [
    {
      title: t('hr-analytics-employment-type-distribution'),
      data: employmentTypeDistribution,
      tableData: transformEmploymentTypeData(),
      testId: 'employment-type-chart',
      tag: t('hr-analytics-types', { count: employmentTypeDistribution.length }),
      description: t('hr-analytics-employment-type-description')
    },
    {
      title: t('hr-analytics-contract-type-distribution'),
      data: contractTypeDistribution,
      tableData: transformContractTypeData(),
      testId: 'contract-type-chart',
      tag: t('hr-analytics-contract-breakdown'),
      description: t('hr-analytics-contract-types-description')
    },
    {
      title: t('hr-analytics-gap-rate-by-organizational-unit'),
      data: gapRateByOrgUnit,
      tableData: transformGapRateByOrgUnitData(),
      testId: 'gap-rate-org-unit-chart',
      tag: t('hr-analytics-position-gaps'),
      description: t('hr-analytics-gap-rate-description')
    },
    {
      title: t('hr-analytics-probation-rate-by-organizational-unit'),
      data: probationRateByOrgUnit,
      tableData: transformProbationRateByOrgUnitData(),
      testId: 'probation-rate-org-unit-chart',
      tag: t('hr-analytics-probation-status'),
      description: t('hr-analytics-probation-rate-description')
    },
    {
      title: t('hr-analytics-tenure-distribution-by-organizational-unit'),
      data: tenureDistribution,
      tableData: transformTenureHeatmapData(),
      testId: 'tenure-heatmap-chart',
      tag: t('hr-analytics-data-points', { count: tenureDistribution.length }),
      description: t('hr-analytics-tenure-chart-description')
    }
  ]

  // Mock export functions
  const handleExport = async (format: 'excel' | 'pdf', tableName: string, data: TableData[]) => {
    setExportingTable(`${tableName}-${format}`)

    // Mock export delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    console.log(`Exporting ${tableName} as ${format}:`, data)

    setExportingTable(null)
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
          <Card data-testid={`${selectedConfig.testId}-table`} className="gba:mt-6">
            <CardContent>
              {/* Table Header */}
              <div className="gba:flex gba:justify-between gba:items-center gba:mb-4 gba:pb-4 gba:border-b">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">
                    {t('hr-analytics-data-table', { title: selectedConfig.title })}
                  </h3>
                  <Badge
                    variant="outline"
                    className="gba:bg-success-secondary/50 gba:text-success-secondary-foreground"
                  >
                    {t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
                  </Badge>
                </div>
                <div className="gba:flex gba:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTable === `${selectedConfig.testId}-excel`}
                    onClick={e => {
                      e.stopPropagation()
                      handleExport('excel', selectedConfig.testId, selectedConfig.tableData)
                    }}
                    className="gba:flex gba:items-center gba:gap-1"
                  >
                    <PiFileText className="gba:w-3 gba:h-3" />
                    {t('common-export-excel')}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTable === `${selectedConfig.testId}-pdf`}
                    onClick={e => {
                      e.stopPropagation()
                      handleExport('pdf', selectedConfig.testId, selectedConfig.tableData)
                    }}
                    className="gba:flex gba:items-center gba:gap-1"
                  >
                    <PiFilePdf className="gba:w-3 gba:h-3" />
                    {t('common-export-pdf')}
                  </Button>
                </div>
              </div>

              <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{selectedConfig.description}</p>

              <div className="gba:max-h-96 gba:overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="gba:w-2/5">
                        {selectedConfig.testId === 'employment-type-chart'
                          ? t('hr-analytics-employment-type')
                          : selectedConfig.testId === 'contract-type-chart'
                            ? t('hr-analytics-contract-types')
                            : selectedConfig.testId === 'gap-rate-org-unit-chart'
                              ? t('hr-analytics-entity-organizational-unit')
                              : selectedConfig.testId === 'probation-rate-org-unit-chart'
                                ? t('hr-analytics-entity-organizational-unit')
                                : t('common-category')}
                      </TableHead>
                      <TableHead className="gba:w-3/5">
                        {selectedConfig.testId === 'employment-type-chart'
                          ? t('hr-analytics-employee-count')
                          : selectedConfig.testId === 'contract-type-chart'
                            ? t('hr-analytics-employee-count')
                            : selectedConfig.testId === 'gap-rate-org-unit-chart'
                              ? t('hr-analytics-gap-rate')
                              : selectedConfig.testId === 'probation-rate-org-unit-chart'
                                ? t('hr-analytics-probation-rate')
                                : t('hr-analytics-employee-count')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedConfig.tableData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="gba:font-medium">{item.period}</TableCell>
                        <TableCell>
                          {typeof item.value === 'number' ? (
                            <Badge
                              variant="outline"
                              className="gba:bg-info-secondary/50 gba:text-info-secondary-foreground"
                            >
                              {item.value.toLocaleString()}
                            </Badge>
                          ) : (
                            <span className="gba:text-sm">{item.value}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
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
            </CardContent>
          </Card>
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
