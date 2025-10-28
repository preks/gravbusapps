/**
 * Shared chart utilities for equity investment charts
 */

// Design system chart colors using CSS variables
export const CHART_COLORS = [
  'var(--nw-color-primary-500)', // Blue
  'var(--nw-color-success-500)', // Green
  'var(--nw-color-warning-500)', // Yellow/Orange
  'var(--nw-color-danger-500)', // Red
  'var(--nw-color-info-500)' // Light Blue
]

// Custom label renderer for pie charts - returns label props
export const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="var(--nw-color-white)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

// Chart configuration helpers
export const createChartConfig = (data: any[]) => {
  const config: any = {}
  for (const [index, entry] of data.entries()) {
    const key = entry.name.toLowerCase().replaceAll(/\s+/g, '')
    config[key] = {
      label: entry.name,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }
  }
  return config
}
