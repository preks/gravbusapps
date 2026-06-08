import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts'
import { ChartBarIcon, ChartLineIcon } from '@phosphor-icons/react'
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  useTranslation
} from '@newwork/nw-design-system'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import translations from '../../../../../_i18n'
import { ChartCard, ChartTypeSwitcher } from '@/common/components/customer/campaign-management/ChartCard'
import {
  CATEGORY_AXIS_PROPS,
  CATEGORY_CHART_MARGIN,
  truncateChartLabel
} from '@/common/components/customer/campaign-management/ChartHelpers'

/**
 * Custom tooltip for campaign performance chart
 * Using design system tooltip styling
 */
interface PerformanceTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const PerformanceTooltip: React.FC<PerformanceTooltipProps> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <div className="gba:bg-card gba:text-card-foreground gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-md">
        <div className="gba:mb-2 gba:font-medium gba:text-foreground">Campaign: {label}</div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="gba:font-medium">{entry.name}:</span>
            <span className="gba:font-semibold">{entry.value}</span>
          </div>
        ))}
        {data.totalRevenue !== undefined && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:mt-2 gba:pt-2 gba:border-t">
            <div
              className="gba:w-3 gba:h-3 gba:rounded-full"
              style={{ backgroundColor: 'var(--color-totalRevenue)' }}
            />
            <span className="gba:font-medium">Total Revenue:</span>
            <span className="gba:font-semibold">{formatCurrencyCompact(data.totalRevenue, 'USD')}</span>
          </div>
        )}
      </div>
    )
  }
  return null
}

const CampaignsPerformanceComparison: React.FC<CampaignsAnalyticsComponentProps> = ({
  campaignComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const { t } = useTranslation(translations)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  // Chart configuration using design system approach (same as IRM Portfolio)
  const chartConfig = useMemo(
    () => ({
      leadsCount: { label: 'Leads' },
      accountsCount: { label: 'Accounts' },
      contactsCount: { label: 'Contacts' },
      opportunitiesCount: { label: 'Opportunities' },
      totalRevenue: { label: 'Total Revenue' }
    }),
    []
  )

  // Common chart configuration to eliminate duplication
  const commonChartProps = {
    data: campaignComparisons,
    margin: CATEGORY_CHART_MARGIN
  }

  const commonAxisProps = {
    xAxis: {
      dataKey: 'campaignName',
      ...CATEGORY_AXIS_PROPS,
      tickFormatter: truncateChartLabel
    }
  }

  return (
    <ChartCard
      title={t('campaigns-analytics-performanceComparison-title')}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={campaignComparisons.length === 0}
      emptyMessage={t('campaigns-analytics-performanceComparison-noData')}
      headerActions={
        <ChartTypeSwitcher
          options={[
            { value: 'bar' as const, label: 'Bar Chart', icon: <ChartBarIcon /> },
            { value: 'line' as const, label: 'Line Chart', icon: <ChartLineIcon /> }
          ]}
          activeType={chartType}
          onChange={setChartType}
          data-testid="performance-comparison-chart-type"
        />
      }
      data-testid="campaigns-performance-comparison"
    >
      <ChartContainer config={chartConfig} className="gba:h-[500px] gba:w-full">
        {chartType === 'bar' ? (
          <BarChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis />
            <ChartTooltip content={<PerformanceTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="leadsCount" fill="var(--color-leadsCount)" name="Leads" radius={[4, 4, 0, 0]} />
            <Bar dataKey="accountsCount" fill="var(--color-accountsCount)" name="Accounts" radius={[4, 4, 0, 0]} />
            <Bar dataKey="contactsCount" fill="var(--color-contactsCount)" name="Contacts" radius={[4, 4, 0, 0]} />
            <Bar
              dataKey="opportunitiesCount"
              fill="var(--color-opportunitiesCount)"
              name="Opportunities"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        ) : (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis />
            <ChartTooltip content={<PerformanceTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="leadsCount"
              stroke="var(--color-leadsCount)"
              name="Leads"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="accountsCount"
              stroke="var(--color-accountsCount)"
              name="Accounts"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="contactsCount"
              stroke="var(--color-contactsCount)"
              name="Contacts"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="opportunitiesCount"
              stroke="var(--color-opportunitiesCount)"
              name="Opportunities"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        )}
      </ChartContainer>
    </ChartCard>
  )
}

export default CampaignsPerformanceComparison
