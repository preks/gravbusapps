import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts'
import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons'
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from '@newwork/nw-design-system'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { ChartCard, ChartTypeSwitcher } from '@/common/components/customer/campaign-management/ChartCard'

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
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">Campaign: {label}</div>
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
              style={{ backgroundColor: 'var(--color-totalrevenue)' }}
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
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  // Chart configuration using design system approach (same as IRM Portfolio)
  const chartConfig = useMemo(
    () => ({
      leadscount: { label: 'Leads' },
      accountscount: { label: 'Accounts' },
      contactscount: { label: 'Contacts' },
      opportunitiescount: { label: 'Opportunities' },
      totalrevenue: { label: 'Total Revenue' }
    }),
    []
  )

  // Common chart configuration to eliminate duplication
  const commonChartProps = {
    data: campaignComparisons,
    margin: { top: 20, right: 30, left: 20, bottom: 120 }
  }

  const commonAxisProps = {
    xAxis: { dataKey: 'campaignName', angle: -45, textAnchor: 'end' as const, height: 100, interval: 0 as const }
  }

  return (
    <ChartCard
      title={getTranslationFromI18nKeyAndLabel(
        'campaigns.analytics.performanceComparison.title',
        'Last 5 Campaigns Comparison'
      )}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={campaignComparisons.length === 0}
      emptyMessage={getTranslationFromI18nKeyAndLabel(
        'campaigns.analytics.performanceComparison.noData',
        'No campaign performance data available'
      )}
      headerActions={
        <ChartTypeSwitcher
          options={[
            { value: 'bar' as const, label: 'Bar Chart', icon: <BarChartOutlined /> },
            { value: 'line' as const, label: 'Line Chart', icon: <LineChartOutlined /> }
          ]}
          activeType={chartType}
          onChange={setChartType}
          data-testid="performance-comparison-chart-type"
        />
      }
      data-testid="campaigns-performance-comparison"
    >
      <ChartContainer config={chartConfig} className="gba:h-[400px] gba:w-full">
        {chartType === 'bar' ? (
          <BarChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis />
            <ChartTooltip content={<PerformanceTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="leadsCount" fill="var(--color-leadscount)" name="Leads" radius={[4, 4, 0, 0]} />
            <Bar dataKey="accountsCount" fill="var(--color-accountscount)" name="Accounts" radius={[4, 4, 0, 0]} />
            <Bar dataKey="contactsCount" fill="var(--color-contactscount)" name="Contacts" radius={[4, 4, 0, 0]} />
            <Bar
              dataKey="opportunitiesCount"
              fill="var(--color-opportunitiescount)"
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
              stroke="var(--color-leadscount)"
              name="Leads"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="accountsCount"
              stroke="var(--color-accountscount)"
              name="Accounts"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="contactsCount"
              stroke="var(--color-contactscount)"
              name="Contacts"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="opportunitiesCount"
              stroke="var(--color-opportunitiescount)"
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
