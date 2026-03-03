// Chart renderer for slide elements using NEWWORK design system charts.

import React, { useMemo } from 'react'
import {
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  PolarGrid,
  PolarAngleAxis,
  Cell
} from 'recharts'
import type { ChartElement } from './slideElements'

export interface SlideChartRendererProps {
  element: ChartElement
  width: number
  height: number
  disableAnimations?: boolean
}

const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)'
]

export const SlideChartRenderer: React.FC<SlideChartRendererProps> = ({ element, disableAnimations = false }) => {
  const { chartType, data, series, showLegend, showGrid, showTooltip, title, backgroundColor, borderRadius } = element
  const isAnimationActive = !disableAnimations

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    series.forEach((s, index) => {
      config[s.key] = {
        label: s.label,
        color: s.color || CHART_COLORS[index % CHART_COLORS.length]
      }
    })
    return config
  }, [series])

  const renderBarChart = () => (
    <BarChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
      {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
      {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />}
      {series.map(s => (
        <Bar
          key={s.key}
          dataKey={s.key}
          fill={`var(--color-${s.key})`}
          radius={4}
          isAnimationActive={isAnimationActive}
        />
      ))}
      {showLegend && <ChartLegend content={<ChartLegendContent />} />}
    </BarChart>
  )

  const renderLineChart = () => (
    <LineChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
      {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
      {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent />} />}
      {series.map(s => (
        <Line
          key={s.key}
          dataKey={s.key}
          type="monotone"
          stroke={`var(--color-${s.key})`}
          strokeWidth={2}
          dot={false}
          isAnimationActive={isAnimationActive}
        />
      ))}
      {showLegend && <ChartLegend content={<ChartLegendContent />} />}
    </LineChart>
  )

  const renderAreaChart = () => (
    <AreaChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
      {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
      {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />}
      {series.map(s => (
        <Area
          key={s.key}
          dataKey={s.key}
          type="natural"
          fill={`var(--color-${s.key})`}
          fillOpacity={0.4}
          stroke={`var(--color-${s.key})`}
          stackId="a"
          isAnimationActive={isAnimationActive}
        />
      ))}
      {showLegend && <ChartLegend content={<ChartLegendContent />} />}
    </AreaChart>
  )

  const renderPieChart = () => {
    const pieData = data.map((d, index) => ({
      ...d,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }))
    const dataKey = series[0]?.key || 'value1'

    return (
      <PieChart margin={{ top: 12, bottom: 12 }}>
        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />}
        <Pie
          data={pieData}
          dataKey={dataKey}
          nameKey="label"
          innerRadius={0}
          outerRadius="80%"
          label
          isAnimationActive={isAnimationActive}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        {showLegend && <ChartLegend content={<ChartLegendContent nameKey="label" />} />}
      </PieChart>
    )
  }

  const renderRadarChart = () => (
    <RadarChart data={data} margin={{ top: 12, bottom: 12 }}>
      {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent />} />}
      <PolarAngleAxis dataKey="label" fontSize={12} />
      {showGrid && <PolarGrid />}
      {series.map(s => (
        <Radar
          key={s.key}
          dataKey={s.key}
          fill={`var(--color-${s.key})`}
          fillOpacity={0.6}
          stroke={`var(--color-${s.key})`}
          isAnimationActive={isAnimationActive}
        />
      ))}
      {showLegend && <ChartLegend content={<ChartLegendContent />} />}
    </RadarChart>
  )

  const renderRadialChart = () => {
    const radialData = data.map((d, index) => ({
      ...d,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }))
    const dataKey = series[0]?.key || 'value1'

    return (
      <RadialBarChart data={radialData} innerRadius={30} outerRadius="90%" margin={{ top: 12, bottom: 12 }}>
        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="label" />} />}
        <RadialBar dataKey={dataKey} background isAnimationActive={isAnimationActive} />
        {showLegend && <ChartLegend content={<ChartLegendContent nameKey="label" />} />}
      </RadialBarChart>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'area':
        return renderAreaChart()
      case 'pie':
        return renderPieChart()
      case 'radar':
        return renderRadarChart()
      case 'radial':
        return renderRadialChart()
      default:
        return renderBarChart()
    }
  }

  return (
    <div
      className="gba:w-full gba:h-full gba:flex gba:flex-col"
      style={{
        backgroundColor,
        borderRadius: `${borderRadius}px`
      }}
    >
      {title && <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:px-3 gba:pt-2">{title}</div>}
      <div className="gba:flex-1 gba:min-h-0">
        <ChartContainer config={chartConfig} className="gba:w-full gba:h-full">
          {renderChart()}
        </ChartContainer>
      </div>
    </div>
  )
}

export default SlideChartRenderer
