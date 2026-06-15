import React from 'react'
import { Card, CardContent, CardHeader, Badge, useTranslation } from '@newwork/nw-design-system'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DemographicsData } from '../../../../hooks/useDemographicsDataIntegration'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useAnalyticsTableExport } from '../../../../hooks/useAnalyticsTableExport'
import { useChartTableSelection } from '../../../../hooks/useChartTableSelection'
import AnalyticsDataTable, { HIGHLIGHT_BADGE } from '../../../shared/AnalyticsDataTable'
import { DEMOGRAPHICS_CHART_SURFACE_CLASS } from '../../../shared/analyticsChartSurfaceStyles'

interface DemographicsChartsViewProps {
  demographicsData: DemographicsData
  isLoading: boolean
  dataTestId: string
}

interface TableData {
  category: string
  value: number
  percentage: string
}

interface DemographicsLegendProps {
  testId: string
  data: Array<{ category: string }>
  colors: string[]
}

const DemographicsLegend: React.FC<DemographicsLegendProps> = ({ testId, data, colors }) => (
  <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-3 gba:mt-2 gba:text-[10px]">
    {data.map((entry, entryIndex) => (
      <div key={`${testId}-${entry.category}`} className="gba:flex gba:items-center gba:gap-1">
        <span
          className="gba:inline-block gba:w-2.5 gba:h-2.5"
          style={{ backgroundColor: colors[entryIndex % colors.length] }}
        />
        <span>{entry.category}</span>
      </div>
    ))}
  </div>
)

const DemographicsChartsView: React.FC<DemographicsChartsViewProps> = ({ demographicsData, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  const { handleExport, resolveExportingFormat } = useAnalyticsTableExport()
  const { selectedChart, tableRef, handleChartClick } = useChartTableSelection()

  // Chart colors from design system
  const chartColors = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  // Custom label renderer for pie charts
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show label if percent is greater than 5%
    return percent > 0.05 ? (
      <text
        x={x}
        y={y}
        fill="var(--nw-color-primary-foreground)"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null
  }

  const getAgeSortKey = (category: string): number => {
    const label = String(category || '')
      .trim()
      .toLowerCase()
    if (!label || label === 'unknown') return Number.MAX_SAFE_INTEGER
    if (label.includes('under 25') || label.includes('<25') || label.includes('< 25')) return 24

    const isDigitsOnly = (s: string) => s.length > 0 && [...s].every(c => c >= '0' && c <= '9')

    const dashIdx = label.indexOf('-')
    if (dashIdx !== -1) {
      const before = label.slice(0, dashIdx).trim()
      const after = label.slice(dashIdx + 1).trim()
      if (isDigitsOnly(before) && isDigitsOnly(after)) {
        const num = Number(before)
        if (Number.isFinite(num)) return num
      }
    }

    const plusIdx = label.indexOf('+')
    if (plusIdx !== -1) {
      const before = label.slice(0, plusIdx).trim()
      if (isDigitsOnly(before)) {
        const num = Number(before)
        if (Number.isFinite(num)) return num
      }
    }

    if (label.startsWith('under')) {
      const rest = label.slice(5).trim()
      if (isDigitsOnly(rest)) {
        const num = Number(rest)
        if (Number.isFinite(num)) return num - 1
      }
    }

    return Number.MAX_SAFE_INTEGER
  }

  // Safe access to data with null checks
  const genderData = demographicsData?.genderDistribution || []
  const ageData = [...(demographicsData?.ageDistribution || [])].sort((a, b) => {
    const aKey = getAgeSortKey(a.category)
    const bKey = getAgeSortKey(b.category)
    if (aKey !== bKey) return aKey - bKey
    return String(a.category).localeCompare(String(b.category))
  })
  const nationalityData = demographicsData?.nationalityDistribution || []

  // Transform data to include percentages
  const transformData = (data: Array<{ category: string; value: number }>): TableData[] => {
    if (!data || data.length === 0) return []

    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      category: item.category,
      value: item.value,
      percentage: total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'
    }))
  }

  const exportColumnsDemographics = [
    { key: 'category', header: t('common-category') },
    { key: 'value', header: t('hr-analytics-employee-count') },
    { key: 'percentage', header: t('hr-analytics-percentage'), badge: HIGHLIGHT_BADGE }
  ]

  const chartConfigs = [
    {
      title: t('hr-analytics-gender-distribution'),
      data: genderData,
      tableData: transformData(genderData),
      colors: chartColors,
      testId: 'gender-chart',
      tag: t('hr-analytics-categories', { count: genderData.length }),
      description: t('hr-analytics-gender-description'),
      exportColumns: exportColumnsDemographics
    },
    {
      title: t('hr-analytics-age-distribution'),
      data: ageData,
      tableData: transformData(ageData),
      colors: chartColors,
      testId: 'age-chart',
      tag: t('hr-analytics-age-groups', { count: ageData.length }),
      description: t('hr-analytics-age-description'),
      exportColumns: exportColumnsDemographics
    },
    {
      title: t('hr-analytics-nationality-distribution'),
      data: nationalityData.slice(0, 8), // Show top 8 nationalities in chart
      tableData: transformData(nationalityData), // Show all in table
      colors: chartColors,
      testId: 'nationality-chart',
      tag: t('hr-analytics-top-8-of-nationalities', { total: nationalityData.length }),
      description: t('hr-analytics-nationality-description'),
      exportColumns: exportColumnsDemographics
    }
  ]
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-charts-view`}>
        {/* Loading Charts Row */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
          {[1, 2, 3].map(index => (
            <Card key={index} className="gba:animate-pulse">
              <CardHeader>
                <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="gba:h-80 gba:bg-muted gba:rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div data-testid={`${dataTestId}-charts-view`}>
      {/* Charts Row */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
        {chartConfigs.map(config => {
          const isSelected = selectedChart === config.testId

          return (
            <Card
              key={config.testId}
              data-testid={`${dataTestId}-${config.testId}`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                isSelected ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <h4 className="gba:m-0 gba:text-lg gba:font-semibold gba:text-foreground">
                      {config.title}
                    </h4>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">{config.description}</p>
                {isSelected && (
                  <p className="gba:text-xs gba:text-info gba:mt-1">
                    ✓ {t('common-selected')} - {t('hr-analytics-table-shown-below')}
                  </p>
                )}
              </CardHeader>

              <CardContent>
                <div className={`gba:h-64 ${DEMOGRAPHICS_CHART_SURFACE_CLASS}`}>
                  {config.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart accessibilityLayer={false}>
                        <Pie
                          data={config.data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={60}
                          fill="var(--nw-chart-1)"
                          dataKey="value"
                          nameKey="category"
                        >
                          {config.data.map((_, entryIndex) => (
                            <Cell key={`cell-${entryIndex}`} fill={config.colors[entryIndex % config.colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            `${Number(value ?? 0)} ${t('hr-analytics-employees')}`,
                            String(name ?? '')
                          ]}
                        />
                        <Legend
                          content={
                            <DemographicsLegend testId={config.testId} data={config.data} colors={config.colors} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
                      <p className="gba:text-muted-foreground gba:text-sm">{t('hr-analytics-no-data')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selected Chart Data Table */}
      <div ref={tableRef}>
        {selectedConfig && (
          <AnalyticsDataTable
            dataTestId={`${dataTestId}-${selectedConfig.testId}-table`}
            title={t('hr-analytics-data-table', { title: selectedConfig.title })}
            description={selectedConfig.description}
            entriesText={t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
            columns={selectedConfig.exportColumns}
            rows={selectedConfig.tableData}
            exportingFormat={resolveExportingFormat(selectedConfig.testId)}
            exportExcelTestId={`${dataTestId}-${selectedConfig.testId}-export-excel`}
            exportPdfTestId={`${dataTestId}-${selectedConfig.testId}-export-pdf`}
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
            getRowKey={row => row.category}
            renderCell={(item, col) => {
              if (col.key === 'category') return <span className="gba:font-medium">{item.category}</span>
              if (col.key === 'value') return item.value.toLocaleString()
              if (col.key === 'percentage') return item.percentage
              return '-'
            }}
            footer={
              <div className="gba:mt-4 gba:p-3 gba:bg-muted gba:rounded-md gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-sm">
                  {t('hr-analytics-total-label')}:{' '}
                  {selectedConfig.tableData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}{' '}
                  {t('hr-analytics-employees')}
                </span>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {t('hr-analytics-categories', { count: selectedConfig.tableData.length })}
                </span>
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

export default DemographicsChartsView
