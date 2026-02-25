import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import TurnoverRetentionStatistics from '../components/TurnoverRetentionStatistics'
import TurnoverRateChart from '../components/TurnoverRateChart'
import TenureDistributionChart from '../components/TenureDistributionChart'
import RetentionByDepartmentChart from '../components/RetentionByDepartmentChart'
import { useTurnoverRetentionData } from '../../../../../hooks/useTurnoverRetentionData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../../../hooks/useChartTableSelection'
import { HIGHLIGHT_BADGE } from '../../../../shared/AnalyticsDataTable'
import type { AnalyticsTableData } from '../../../../shared/analyticsTabTypes'
import AnalyticsTabErrorCard from '../../../../shared/AnalyticsTabErrorCard'
import SelectableChartCard from '../../../../shared/SelectableChartCard'
import AnalyticsTableSection from '../../../../shared/AnalyticsTableSection'
import { renderPeriodValueCell } from '../../../../shared/analyticsTableRenderers'

const TurnoverRetention: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  const { statistics, turnoverRateOverTime, tenureDistribution, retentionByDepartment, isLoading, error, refetch } =
    useTurnoverRetentionData(context)

  // Transform data for table display
  const transformTurnoverRateData = (): AnalyticsTableData[] => {
    return turnoverRateOverTime.map((item, index) => ({
      period: new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      value: `${item.value.toFixed(1)}%`,
      change: index > 0 ? item.value - turnoverRateOverTime[index - 1].value : 0
    }))
  }

  const transformTenureDistributionData = (): AnalyticsTableData[] => {
    return tenureDistribution.map(item => ({
      period: item.category,
      value: item.value
    }))
  }

  const transformRetentionByDepartmentData = (): AnalyticsTableData[] => {
    return retentionByDepartment.map(item => ({
      period: item.category,
      value: `${item.value.toFixed(1)}%`
    }))
  }

  // Chart configurations
  const chartConfigs = [
    {
      title: t('hr-analytics-turnover-rate-over-time'),
      data: turnoverRateOverTime,
      tableData: transformTurnoverRateData(),
      testId: 'turnover-rate-chart',
      tag: t('hr-analytics-months', { count: turnoverRateOverTime.length }),
      description: t('hr-analytics-turnover-rate-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-month') },
        { key: 'value', header: t('hr-analytics-turnover-rate'), badge: HIGHLIGHT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-employee-tenure-distribution'),
      data: tenureDistribution,
      tableData: transformTenureDistributionData(),
      testId: 'tenure-distribution-chart',
      tag: t('hr-analytics-tenure-ranges', { count: tenureDistribution.length }),
      description: t('hr-analytics-employee-tenure-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-tenure-range') },
        { key: 'value', header: t('hr-analytics-employees'), badge: HIGHLIGHT_BADGE }
      ]
    },
    {
      title: t('hr-analytics-retention-by-department'),
      data: retentionByDepartment,
      tableData: transformRetentionByDepartmentData(),
      testId: 'retention-by-department-chart',
      tag: t('hr-analytics-departments', { count: retentionByDepartment.length }),
      description: t('hr-analytics-retention-by-department-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-retention-rate'), badge: HIGHLIGHT_BADGE }
      ]
    }
  ]
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (error) {
    return (
      <AnalyticsTabErrorCard
        dataTestId="turnover-retention-error"
        message={t('hr-analytics-failed-to-load-turnover-retention')}
        detail={error}
        retryLabel={t('common-retry')}
        onRetry={refetch}
        variant="row"
      />
    )
  }

  return (
    <div data-testid="turnover-retention-tab">
      {/* Statistics Overview */}
      <TurnoverRetentionStatistics statistics={statistics} isLoading={isLoading} dataTestId="turnover-retention" />

      {/* Interactive Charts Section */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
          {t('hr-analytics-turnover-retention-analysis')}
        </h3>
        <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
      </div>

      {/* Charts Grid */}
      <div className="gba:space-y-6 gba:mt-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <SelectableChartCard
            testId="turnover-rate-chart"
            isSelected={selectedChart === 'turnover-rate-chart'}
            onSelect={() => handleChartClick('turnover-rate-chart')}
            title={chartConfigs[0].title}
            tag={chartConfigs[0].tag}
            description={chartConfigs[0].description}
            selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
          >
            <TurnoverRateChart data={turnoverRateOverTime} isLoading={isLoading} dataTestId="turnover-rate-chart" />
          </SelectableChartCard>
          <SelectableChartCard
            testId="tenure-distribution-chart"
            isSelected={selectedChart === 'tenure-distribution-chart'}
            onSelect={() => handleChartClick('tenure-distribution-chart')}
            title={chartConfigs[1].title}
            tag={chartConfigs[1].tag}
            description={chartConfigs[1].description}
            selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
          >
            <TenureDistributionChart
              data={tenureDistribution}
              isLoading={isLoading}
              dataTestId="tenure-distribution-chart"
            />
          </SelectableChartCard>
        </div>

        <div className="gba:w-full">
          <SelectableChartCard
            testId="retention-by-department-chart"
            isSelected={selectedChart === 'retention-by-department-chart'}
            onSelect={() => handleChartClick('retention-by-department-chart')}
            title={chartConfigs[2].title}
            tag={chartConfigs[2].tag}
            description={chartConfigs[2].description}
            selectedHint={`✓ ${t('common-selected')} - ${t('hr-analytics-table-shown-below')}`}
          >
            <RetentionByDepartmentChart
              data={retentionByDepartment}
              isLoading={isLoading}
              dataTestId="retention-by-department-chart"
            />
          </SelectableChartCard>
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
        footerVariant="simple"
        simpleFooterCountText={
          selectedConfig ? t('hr-analytics-total-data-points', { count: selectedConfig.tableData.length }) : undefined
        }
        simpleFooterTitle={selectedConfig?.title}
      />
    </div>
  )
}

export default TurnoverRetention
