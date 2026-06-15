export const CHART_HEIGHT_CLASS = 'gba:h-[400px] gba:w-full'
export const CHART_MARGIN = { top: 10, right: 16, left: 4, bottom: 0 }
export const Y_AXIS_WIDTH = 72

export const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)'
]

export const buildChartConfig = (items: Array<{ key: string; label: string }>) => {
  const config: Record<string, { label: string; color: string }> = {}

  items.forEach((item, index) => {
    config[item.key] = {
      label: item.label,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }
  })

  return config
}

export const getYAxisDomain = (values: number[]): [number, number | 'auto'] => {
  const maxValue = Math.max(...values, 0)
  if (maxValue === 0) {
    return [0, 1]
  }

  return [0, 'auto']
}
