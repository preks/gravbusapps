import React from 'react'
import { Card, CardContent, CardHeader, Badge, useTranslation } from '@newwork/nw-design-system'
import { Typography } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import TurnoverRetentionStatistics from '../components/TurnoverRetentionStatistics'
import TurnoverRateChart from '../components/TurnoverRateChart'
import TenureDistributionChart from '../components/TenureDistributionChart'
import RetentionByDepartmentChart from '../components/RetentionByDepartmentChart'
import { useTurnoverRetentionData } from '../../../../../hooks/useTurnoverRetentionData'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../../../hooks/useChartTableSelection'
import AnalyticsDataTable, { HIGHLIGHT_BADGE } from '../../../../shared/AnalyticsDataTable'

const { Title, Text } = Typography

interface TableData {
  period: string
  value: number | string
  change?: number
}

const TurnoverRetention: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  const { statistics, turnoverRateOverTime, tenureDistribution, retentionByDepartment, isLoading, error, refetch } =
    useTurnoverRetentionData(context)

  // Transform data for table display
  const transformTurnoverRateData = (): TableData[] => {
    return turnoverRateOverTime.map((item, index) => ({
      period: new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      value: `${item.value.toFixed(1)}%`,
      change: index > 0 ? item.value - turnoverRateOverTime[index - 1].value : 0
    }))
  }

  const transformTenureDistributionData = (): TableData[] => {
    return tenureDistribution.map(item => ({
      period: item.category,
      value: item.value
    }))
  }

  const transformRetentionByDepartmentData = (): TableData[] => {
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
        { key: 'value', header: t('hr-analytics-employees') }
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
      <div data-testid="turnover-retention-error">
        <Card className="gba:border-destructive-secondary gba:bg-destructive-secondary/50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-destructive-secondary-foreground gba:font-medium gba:mb-2">
                  {t('hr-analytics-failed-to-load-turnover-retention')}
                </h3>
                <p className="gba:text-destructive-secondary-foreground">{error}</p>
              </div>
              <button
                onClick={refetch}
                className="gba:px-4 gba:py-2 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive-secondary-foreground"
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
        {/* Top Row: Turnover Rate and Tenure Distribution */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          {/* Turnover Rate Over Time */}
          {(() => {
            const config = chartConfigs.find(c => c.testId === 'turnover-rate-chart')
            if (!config) return null
            const isSelected = selectedChart === config.testId

            return (
              <Card
                key={config.testId}
                data-testid={`${config.testId}-card`}
                className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                  isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
                }`}
                onClick={() => handleChartClick(config.testId)}
              >
                <CardHeader className="gba:border-b">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Title level={4} className="gba:m-0 gba:text-foreground">
                        {config.title}
                      </Title>
                    </div>
                    <Badge variant="outline" className="gba:text-xs">
                      {config.tag}
                    </Badge>
                  </div>
                  <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">{config.description}</Text>
                  {isSelected && (
                    <p className="gba:text-xs gba:text-info gba:mt-1">
                      ✓ {t('common-selected')} - {t('hr-analytics-table-shown-below')}
                    </p>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="gba:h-64">
                    <TurnoverRateChart
                      data={turnoverRateOverTime}
                      isLoading={isLoading}
                      dataTestId="turnover-rate-chart"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Employee Tenure Distribution */}
          {(() => {
            const config = chartConfigs.find(c => c.testId === 'tenure-distribution-chart')
            if (!config) return null
            const isSelected = selectedChart === config.testId

            return (
              <Card
                key={config.testId}
                data-testid={`${config.testId}-card`}
                className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                  isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
                }`}
                onClick={() => handleChartClick(config.testId)}
              >
                <CardHeader className="gba:border-b">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Title level={4} className="gba:m-0 gba:text-foreground">
                        {config.title}
                      </Title>
                    </div>
                    <Badge variant="outline" className="gba:text-xs">
                      {config.tag}
                    </Badge>
                  </div>
                  <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">{config.description}</Text>
                  {isSelected && (
                    <p className="gba:text-xs gba:text-info gba:mt-1">
                      ✓ {t('common-selected')} - {t('hr-analytics-table-shown-below')}
                    </p>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="gba:h-64">
                    <TenureDistributionChart
                      data={tenureDistribution}
                      isLoading={isLoading}
                      dataTestId="tenure-distribution-chart"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </div>

        {/* Bottom Row: Retention by Department (Full Width) */}
        <div className="gba:w-full">
          {(() => {
            const config = chartConfigs.find(c => c.testId === 'retention-by-department-chart')
            if (!config) return null
            const isSelected = selectedChart === config.testId

            return (
              <Card
                key={config.testId}
                data-testid={`${config.testId}-card`}
                className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                  isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
                }`}
                onClick={() => handleChartClick(config.testId)}
              >
                <CardHeader className="gba:border-b">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Title level={4} className="gba:m-0 gba:text-foreground">
                        {config.title}
                      </Title>
                    </div>
                    <Badge variant="outline" className="gba:text-xs">
                      {config.tag}
                    </Badge>
                  </div>
                  <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">{config.description}</Text>
                  {isSelected && (
                    <p className="gba:text-xs gba:text-info gba:mt-1">
                      ✓ {t('common-selected')} - {t('hr-analytics-table-shown-below')}
                    </p>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="gba:h-64">
                    <RetentionByDepartmentChart
                      data={retentionByDepartment}
                      isLoading={isLoading}
                      dataTestId="retention-by-department-chart"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })()}
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
                selectedConfig.tableData as unknown as Record<string, unknown>[]
              )
            }
            getRowKey={(_, index) => `${selectedConfig.testId}-${index}`}
            renderCell={(item, col) => {
              if (col.key === 'period') return <span className="gba:font-medium">{item.period}</span>
              return typeof item.value === 'number' ? item.value.toLocaleString() : item.value
            }}
            footer={
              <div className="gba:mt-4 gba:p-3 gba:bg-muted gba:rounded-md gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-sm">
                  {t('hr-analytics-total-data-points', { count: selectedConfig.tableData.length })}
                </span>
                <span className="gba:text-sm gba:text-muted-foreground">{selectedConfig.title}</span>
              </div>
            }
          />
        )}

        {/* Help Text */}
        {!selectedConfig && (
          <div className="gba:text-center gba:py-8">
            <p className="gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TurnoverRetention
