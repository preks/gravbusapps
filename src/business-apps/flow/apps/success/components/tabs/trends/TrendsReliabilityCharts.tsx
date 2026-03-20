import React from 'react'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@newwork/nw-design-system'
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import type { SystemTaskReliabilityData } from '../../../hooks/useSystemTaskReliability'
import { SuccessEmptyState } from '../../shared'

interface TrendsReliabilityChartsProps {
  data: SystemTaskReliabilityData['timeSeries']
  emptyTitle: string
  emptyDescription: string
  successRateLabel: string
  failuresLabel: string
  timeoutsLabel: string
  'data-testid'?: string
}

export const TrendsReliabilityCharts: React.FC<TrendsReliabilityChartsProps> = ({
  data,
  emptyTitle,
  emptyDescription,
  successRateLabel,
  failuresLabel,
  timeoutsLabel,
  'data-testid': testId = 'trends-reliability-charts'
}) => {
  const chartData = data.slice(-10).map(item => ({
    period: item.period,
    successRate: item.successRate ?? 0,
    failedTasks: item.failedTasks ?? 0,
    timedOutTasks: item.timedOutTasks ?? 0
  }))
  const successRateConfig: ChartConfig = {
    successRate: { label: successRateLabel }
  }
  const incidentConfig: ChartConfig = {
    failedTasks: { label: failuresLabel },
    timedOutTasks: { label: timeoutsLabel }
  }

  if (!chartData.length) {
    return <SuccessEmptyState title={emptyTitle} description={emptyDescription} data-testid={`${testId}-empty`} />
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2" data-testid={testId}>
      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <div className="gba:mb-3">
          <span className="gba:text-sm gba:font-medium gba:text-foreground">{successRateLabel}</span>
        </div>
        <ChartContainer config={successRateConfig} className="gba:h-[220px] gba:w-full">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              width={36}
              tickFormatter={value => `${Math.round(Number(value))}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="successRate"
              stroke="var(--color-successRate)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <div className="gba:mb-3">
          <span className="gba:text-sm gba:font-medium gba:text-foreground">{failuresLabel}</span>
          <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">/ {timeoutsLabel}</span>
        </div>
        <ChartContainer config={incidentConfig} className="gba:h-[220px] gba:w-full">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="failedTasks" fill="var(--color-failedTasks)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="timedOutTasks" fill="var(--color-timedOutTasks)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
