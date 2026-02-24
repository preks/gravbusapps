/**
 * MultiSeriesChartWidget - renders multi-line, multi-bar, stacked-bar,
 * and stacked-area charts with N series and optional breakdown dimension.
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
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { BoardRow, BoardColumn, MultiSeriesChartWidgetConfig } from '../../types'
import { executeQuery } from '../../services/BoardAnalyticsEngine'

function sanitizeKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unknown'
  )
}

export interface MultiSeriesChartWidgetProps {
  config: MultiSeriesChartWidgetConfig
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

export const MultiSeriesChartWidget: React.FC<MultiSeriesChartWidgetProps> = ({ config, columns, rows, testId }) => {
  const result = useMemo(() => {
    const isTimeBucketed = config.timeBucket && columns.find(c => c.name === config.groupBy)?.type?.includes('date')
    if (isTimeBucketed) {
      return executeQuery(rows, columns, {
        type: 'timeseries',
        query: {
          dateColumn: config.groupBy,
          bucket: config.timeBucket!,
          metrics: config.series.map(s => ({ column: s.column, aggregation: s.aggregation, label: s.label })),
          breakdown: config.breakdown
        }
      })
    }
    return executeQuery(rows, columns, {
      type: 'aggregate',
      query: {
        groupBy: config.groupBy,
        metrics: config.series.map(s => ({ column: s.column, aggregation: s.aggregation, label: s.label })),
        breakdown: config.breakdown,
        sortBy: config.sortBy,
        sortDirection: config.sortDirection,
        limit: config.limit
      }
    })
  }, [config, columns, rows])

  const seriesInfo = useMemo(
    () =>
      config.series.map(s => {
        const rawLabel = s.label || `${s.aggregation}_${s.column}`
        return { rawLabel, safeKey: sanitizeKey(rawLabel) }
      }),
    [config.series]
  )

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    seriesInfo.forEach(({ rawLabel, safeKey }) => {
      cfg[safeKey] = { label: rawLabel }
    })
    return cfg
  }, [seriesInfo])

  const data = useMemo(() => {
    const raw = result.data as Array<Record<string, string | number>>
    return raw.map(d => {
      const mapped: Record<string, string | number> = {
        name: (d as any).group || (d as any).date || 'Unknown'
      }
      seriesInfo.forEach(({ rawLabel, safeKey }) => {
        mapped[safeKey] = d[rawLabel] ?? 0
      })
      return mapped
    })
  }, [result.data, seriesInfo])

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

  const isStacked = config.chartType === 'stacked_bar' || config.chartType === 'stacked_area'
  const chartHeight = 'gba:h-[220px]'

  if (config.chartType === 'line') {
    return (
      <ChartContainer config={chartConfig} className={chartHeight} data-testid={testId}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {seriesInfo.map(({ safeKey }) => (
            <Line
              key={safeKey}
              type="monotone"
              dataKey={safeKey}
              stroke={`var(--color-${safeKey})`}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    )
  }

  if (config.chartType === 'area' || config.chartType === 'stacked_area') {
    return (
      <ChartContainer config={chartConfig} className={chartHeight} data-testid={testId}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {seriesInfo.map(({ safeKey }) => (
            <Area
              key={safeKey}
              type="monotone"
              dataKey={safeKey}
              fill={`var(--color-${safeKey})`}
              fillOpacity={isStacked ? 0.6 : 0.2}
              stroke={`var(--color-${safeKey})`}
              strokeWidth={2}
              stackId={isStacked ? 'stack' : undefined}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={chartConfig} className={chartHeight} data-testid={testId}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {seriesInfo.map(({ safeKey }) => (
          <Bar
            key={safeKey}
            dataKey={safeKey}
            fill={`var(--color-${safeKey})`}
            radius={isStacked ? 0 : 4}
            stackId={isStacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
