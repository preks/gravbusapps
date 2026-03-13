import React from 'react'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, XAxis, YAxis } from 'recharts'
import type { GuardianVelocityInsightsData } from '../../../hooks/useGuardianVelocityInsights'
import { SuccessEmptyState } from '../../shared'

interface CapacityTrendsChartsProps {
  data: GuardianVelocityInsightsData['timeseries']
  emptyTitle: string
  emptyDescription: string
  throughputLabel: string
  wipLabel: string
  cycleTimeLabel: string
  'data-testid'?: string
}

const formatPeriodLabel = (value?: string) => {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return value
  return parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const CapacityTrendsCharts: React.FC<CapacityTrendsChartsProps> = ({
  data,
  emptyTitle,
  emptyDescription,
  throughputLabel,
  wipLabel,
  cycleTimeLabel,
  'data-testid': testId = 'capacity-trends-charts'
}) => {
  const chartData = data.slice(-10).map(point => ({
    period: point.bucketStart,
    label: formatPeriodLabel(point.bucketStart),
    throughputCompleted: point.throughputCompleted ?? 0,
    wipActive: point.wipActive ?? 0,
    cycleTimeMedianMinutes: point.cycleTimeMedianMinutes ?? 0,
    cycleTimeP90Minutes: point.cycleTimeP90Minutes ?? 0
  }))
  const throughputConfig: ChartConfig = {
    throughputCompleted: { label: throughputLabel },
    wipActive: { label: wipLabel }
  }
  const cycleTimeConfig: ChartConfig = {
    cycleTimeMedianMinutes: { label: cycleTimeLabel },
    cycleTimeP90Minutes: { label: 'P90' }
  }

  if (!chartData.length) {
    return <SuccessEmptyState title={emptyTitle} description={emptyDescription} data-testid={`${testId}-empty`} />
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4" data-testid={testId}>
      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <ChartContainer config={throughputConfig} className="gba:h-[220px] gba:w-full">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={28} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              width={28}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.period || '')}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="left"
              dataKey="throughputCompleted"
              fill="var(--color-throughputCompleted)"
              radius={[6, 6, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="wipActive"
              stroke="var(--color-wipActive)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <ChartContainer config={cycleTimeConfig} className="gba:h-[220px] gba:w-full">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={32} />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.period || '')}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="cycleTimeMedianMinutes"
              stroke="var(--color-cycleTimeMedianMinutes)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="cycleTimeP90Minutes"
              stroke="var(--color-cycleTimeP90Minutes)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}
