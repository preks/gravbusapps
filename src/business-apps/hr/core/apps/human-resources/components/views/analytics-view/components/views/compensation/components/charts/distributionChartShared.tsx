import React from 'react'
import { Spin, Empty, Typography } from 'antd'
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const { Text } = Typography

export const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)'
] as const

export interface DistributionTooltipPayload {
  payload: { name: string; percentage?: number }
  value: number
}

export const DistributionTooltip: React.FC<{
  active?: boolean
  payload?: ReadonlyArray<DistributionTooltipPayload>
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]
  return (
    <div className="gba:bg-white gba:p-3 gba:rounded gba:shadow-lg gba:border">
      <p className="gba:font-semibold gba:mb-1">{point.payload.name}</p>
      <p className="gba:text-sm">
        <span className="gba:font-medium">Employees:</span> {point.value.toLocaleString()}
      </p>
      <p className="gba:text-sm">
        <span className="gba:font-medium">Percentage:</span> {Number(point.payload.percentage).toFixed(2)}%
      </p>
    </div>
  )
}

export function renderDistributionPieLabel(props: { payload?: { name: string; percentage?: number } }): string {
  const p = props.payload
  return p ? `${p.name} (${Number(p.percentage ?? 0).toFixed(2)}%)` : ''
}

export interface DistributionChartItem {
  name: string
  count: number
  percentage?: number
}

export function buildDistributionChartData(
  items: DistributionChartItem[],
  colors: readonly string[] = CHART_COLORS
): Array<{ name: string; value: number; percentage: number; fill: string }> {
  return items.map((item, index) => ({
    name: item.name,
    value: item.count,
    percentage: Number((item.percentage ?? 0).toFixed(2)),
    fill: colors[index % colors.length]
  }))
}

export const DistributionChartStateContent: React.FC<{
  loading: boolean
  error: unknown
  hasData: boolean
  errorMessage: string
  emptyMessage: string
  loadingTestId?: string
  emptyTestId?: string
  children: React.ReactNode
}> = ({ loading, error, hasData, errorMessage, emptyMessage, loadingTestId, emptyTestId, children }) => {
  const containerClass = 'gba:flex gba:justify-center gba:items-center gba:h-96'
  if (loading) {
    return (
      <div className={containerClass}>
        <Spin size="large" data-testid={loadingTestId} />
      </div>
    )
  }
  if (error) {
    return (
      <div className={containerClass}>
        <Text type="danger">{errorMessage}</Text>
      </div>
    )
  }
  if (!hasData) {
    return (
      <div className={containerClass}>
        <Empty description={emptyMessage} data-testid={emptyTestId} />
      </div>
    )
  }
  return <>{children}</>
}

function DistributionTooltipContent(props: React.ComponentProps<typeof DistributionTooltip>): React.ReactElement {
  return <DistributionTooltip {...props} />
}

function legendFormatter(value: string, entry: { color?: string }): React.ReactElement {
  return <span style={{ color: entry.color ?? 'inherit' }}>{value}</span>
}

export const DistributionPieChartView: React.FC<{
  chartData: Array<{ name: string; value: number; percentage: number; fill: string }>
}> = ({ chartData }) => (
  <div className="gba:h-96">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="var(--nw-chart-1)"
          dataKey="value"
          label={renderDistributionPieLabel}
        />
        <Tooltip content={DistributionTooltipContent} />
        <Legend verticalAlign="bottom" height={36} formatter={legendFormatter} />
      </PieChart>
    </ResponsiveContainer>
  </div>
)
