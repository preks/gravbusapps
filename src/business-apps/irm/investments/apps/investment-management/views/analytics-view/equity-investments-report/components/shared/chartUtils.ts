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

  return {
    x,
    y,
    fill: 'var(--nw-color-primary-foreground)',
    textAnchor: x > cx ? 'start' : 'end',
    dominantBaseline: 'central',
    fontSize: '12',
    fontWeight: 'bold',
    children: `${(percent * 100).toFixed(1)}%`
  }
}

// Chart configuration helpers
export const createChartConfig = (data: any[]) => {
  const config: any = {}
  data.forEach((entry, index) => {
    const key = entry.name.toLowerCase().replace(/\s+/g, '')
    config[key] = {
      label: entry.name,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }
  })
  return config
}
