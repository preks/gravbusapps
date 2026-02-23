/**
 * ChartWidget - renders bar, line, pie, donut, or area charts
 * using the design system ChartContainer + recharts.
 *
 * Colors are handled by ChartContainer's auto-color system which assigns
 * from --nw-chart-1 through --nw-chart-8 to config keys without explicit colors.
 */

import React, { useMemo } from 'react'
import {
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { BoardRow, BoardColumn, ChartWidgetConfig } from '../../types'

function sanitizeKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unknown'
  )
}

export interface ChartWidgetProps {
  config: ChartWidgetConfig
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

function aggregateData(
  rows: BoardRow[],
  xAxis: string,
  yAxis: string,
  aggregation: string,
  sortDirection?: string,
  limit?: number
): Array<{ name: string; value: number }> {
  const groups = new Map<string, number[]>()

  for (const row of rows) {
    const xVal = String(row.data[xAxis] ?? 'Unknown')
    const yVal = Number(row.data[yAxis])
    if (!groups.has(xVal)) groups.set(xVal, [])
    if (!isNaN(yVal)) groups.get(xVal)!.push(yVal)
    else groups.get(xVal)!.push(0)
  }

  let result = [...groups.entries()].map(([name, values]) => {
    let value: number
    switch (aggregation) {
      case 'sum':
        value = values.reduce((a, b) => a + b, 0)
        break
      case 'avg':
        value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        break
      case 'min':
        value = values.length > 0 ? Math.min(...values) : 0
        break
      case 'max':
        value = values.length > 0 ? Math.max(...values) : 0
        break
      case 'count':
        value = values.length
        break
      default:
        value = values.reduce((a, b) => a + b, 0)
    }
    return { name, value: Math.round(value * 100) / 100 }
  })

  if (sortDirection === 'asc') result.sort((a, b) => a.value - b.value)
  else if (sortDirection === 'desc') result.sort((a, b) => b.value - a.value)

  if (limit && limit > 0) result = result.slice(0, limit)

  return result
}

function resolveColName(columns: BoardColumn[], ref: string): string {
  if (!ref) return ref
  const exact = columns.find(c => c.name === ref)
  if (exact) return exact.name
  const byLabel = columns.find(c => c.label.toLowerCase() === ref.toLowerCase())
  if (byLabel) return byLabel.name
  const byId = columns.find(c => c.id === ref)
  if (byId) return byId.name
  const partial = columns.find(
    c => c.name.toLowerCase().includes(ref.toLowerCase()) || c.label.toLowerCase().includes(ref.toLowerCase())
  )
  if (partial) return partial.name
  return ref
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ config, columns, rows, testId }) => {
  const xAxisResolved = useMemo(() => resolveColName(columns, config.xAxis), [columns, config.xAxis])
  const yAxisResolved = useMemo(() => resolveColName(columns, config.yAxis), [columns, config.yAxis])

  const data = useMemo(
    () =>
      aggregateData(
        rows,
        xAxisResolved,
        yAxisResolved,
        config.aggregation || 'count',
        config.sortDirection,
        config.limit
      ),
    [rows, xAxisResolved, yAxisResolved, config.aggregation, config.sortDirection, config.limit]
  )

  const yCol = columns.find(c => c.name === yAxisResolved)

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {}

    if (config.chartType === 'pie' || config.chartType === 'donut') {
      cfg.value = { label: yCol?.label || config.yAxis, color: 'none' }
      data.forEach(d => {
        cfg[sanitizeKey(d.name)] = { label: d.name }
      })
    } else {
      cfg.value = { label: yCol?.label || config.yAxis }
    }

    return cfg
  }, [data, config.chartType, config.yAxis, yCol?.label])

  const pieData = useMemo(
    () =>
      data.map(d => ({
        ...d,
        key: sanitizeKey(d.name),
        fill: `var(--color-${sanitizeKey(d.name)})`
      })),
    [data]
  )

  if (data.length === 0) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-xs gba:text-muted-foreground"
        data-testid={testId}
      >
        No data for chart
      </div>
    )
  }

  const chartHeight = 'gba:h-[200px]'

  switch (config.chartType) {
    case 'bar':
      return (
        <ChartContainer config={chartConfig} className={chartHeight} data-testid={testId}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      )

    case 'line':
      return (
        <ChartContainer config={chartConfig} className={chartHeight} data-testid={testId}>
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      )

    case 'area':
      return (
        <ChartContainer config={chartConfig} className={chartHeight} data-testid={testId}>
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.2}
              stroke="var(--color-value)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )

    case 'pie':
    case 'donut':
      return (
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[200px]"
          data-testid={testId}
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie data={pieData} dataKey="value" nameKey="key" innerRadius={config.chartType === 'donut' ? '50%' : 0} />
            <ChartLegend content={<ChartLegendContent nameKey="key" />} />
          </PieChart>
        </ChartContainer>
      )

    default:
      return <div className="gba:text-xs gba:text-muted-foreground gba:text-center">Unsupported chart type</div>
  }
}
