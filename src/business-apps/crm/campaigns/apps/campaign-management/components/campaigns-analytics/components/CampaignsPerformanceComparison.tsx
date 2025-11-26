import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts'
import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { CHART_COLORS } from '../../../utils/chartColors'
import {
  TooltipWrapper,
  TooltipDataLine,
  ChartContainer
} from '@/common/components/customer/campaign-management/ChartHelpers'
import { ChartCard, ChartTypeSwitcher } from '@/common/components/customer/campaign-management/ChartCard'

/**
 * Chart data series configuration to eliminate duplication
 */
const CHART_DATA_SERIES = [
  { dataKey: 'leadsCount', name: 'Leads', color: CHART_COLORS.primary },
  { dataKey: 'accountsCount', name: 'Accounts', color: CHART_COLORS.success },
  { dataKey: 'contactsCount', name: 'Contacts', color: CHART_COLORS.accent },
  { dataKey: 'opportunitiesCount', name: 'Opportunities', color: CHART_COLORS.warning }
] as const

/**
 * Custom tooltip for campaign performance chart
 * Extracted to improve performance and testability
 */
interface PerformanceTooltipData {
  leadsCount: number
  accountsCount: number
  contactsCount: number
  opportunitiesCount: number
  totalRevenue: number
}

interface PerformanceTooltipProps {
  active?: boolean
  payload?: Array<{ payload: PerformanceTooltipData }>
  label?: string
}

const PerformanceTooltip: React.FC<PerformanceTooltipProps> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <TooltipWrapper title={label || 'Campaign'}>
        <TooltipDataLine label="Leads" value={data.leadsCount} color={CHART_COLORS.primary} />
        <TooltipDataLine label="Accounts" value={data.accountsCount} color={CHART_COLORS.success} />
        <TooltipDataLine label="Contacts" value={data.contactsCount} color={CHART_COLORS.accent} />
        <TooltipDataLine label="Opportunities" value={data.opportunitiesCount} color={CHART_COLORS.warning} />
        <TooltipDataLine
          label="Revenue"
          value={formatCurrencyCompact(data.totalRevenue, 'USD')}
          color={CHART_COLORS.danger}
        />
      </TooltipWrapper>
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
      <ChartContainer>
        {chartType === 'bar' ? (
          <BarChart {...commonChartProps}>
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis />
            <Tooltip content={<PerformanceTooltip />} />
            {CHART_DATA_SERIES.map(series => (
              <Bar key={series.dataKey} dataKey={series.dataKey} fill={series.color} name={series.name} />
            ))}
          </BarChart>
        ) : (
          <LineChart {...commonChartProps}>
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis />
            <Tooltip content={<PerformanceTooltip />} />
            {CHART_DATA_SERIES.map(series => (
              <Line
                key={series.dataKey}
                type="monotone"
                dataKey={series.dataKey}
                stroke={series.color}
                name={series.name}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        )}
      </ChartContainer>
    </ChartCard>
  )
}

export default CampaignsPerformanceComparison
