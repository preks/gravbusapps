/**
 * ScatterWidget - renders a scatter/bubble plot for correlation analysis.
 */

import React, { useMemo } from 'react'
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis } from 'recharts'
import type { BoardRow, BoardColumn, ScatterWidgetConfig, ScatterPoint } from '../../types'
import { executeQuery } from '../../services/BoardAnalyticsEngine'

export interface ScatterWidgetProps {
  config: ScatterWidgetConfig
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

export const ScatterWidget: React.FC<ScatterWidgetProps> = ({ config, columns, rows, testId }) => {
  const result = useMemo(
    () =>
      executeQuery(rows, columns, {
        type: 'scatter',
        query: {
          xColumn: config.xColumn,
          yColumn: config.yColumn,
          labelColumn: config.labelColumn,
          sizeColumn: config.sizeColumn,
          colorColumn: config.colorColumn
        }
      }),
    [config, columns, rows]
  )

  const xCol = columns.find(c => c.name === config.xColumn)
  const yCol = columns.find(c => c.name === config.yColumn)

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      scatter: { label: `${xCol?.label || config.xColumn} vs ${yCol?.label || config.yColumn}` }
    }),
    [config.xColumn, config.yColumn, xCol?.label, yCol?.label]
  )

  const data = result.data as ScatterPoint[]

  if (data.length === 0) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-xs gba:text-muted-foreground"
        data-testid={testId}
      >
        No data for scatter
      </div>
    )
  }

  const hasSizes = data.some(d => d.size != null)

  return (
    <ChartContainer config={chartConfig} className="gba:h-[220px]" data-testid={testId}>
      <ScatterChart margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name={xCol?.label || config.xColumn}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={10}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yCol?.label || config.yColumn}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={10}
        />
        {hasSizes && <ZAxis type="number" dataKey="size" range={[20, 400]} />}
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
        <Scatter data={data} fill="var(--color-scatter)" />
      </ScatterChart>
    </ChartContainer>
  )
}
