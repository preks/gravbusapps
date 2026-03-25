/**
 * HistogramWidget - renders binned distribution of a numeric column.
 */

import React, { useMemo } from 'react'
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { BoardRow, BoardColumn, HistogramWidgetConfig, HistogramBin } from '../../types'
import { executeQuery } from '../../services/BoardAnalyticsEngine'

export interface HistogramWidgetProps {
  config: HistogramWidgetConfig
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

export const HistogramWidget: React.FC<HistogramWidgetProps> = ({ config, columns, rows, testId }) => {
  const result = useMemo(
    () =>
      executeQuery(rows, columns, {
        type: 'histogram',
        query: { column: config.column, bins: config.bins }
      }),
    [config, columns, rows]
  )

  const col = columns.find(c => c.name === config.column)

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      count: { label: `Distribution of ${col?.label || config.column}` }
    }),
    [config.column, col?.label]
  )

  const data = result.data as HistogramBin[]

  if (data.length === 0) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-xs gba:text-muted-foreground"
        data-testid={testId}
      >
        No data for histogram
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="gba:h-[220px]" data-testid={testId}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={9} interval={0} angle={-30} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={2} />
      </BarChart>
    </ChartContainer>
  )
}
