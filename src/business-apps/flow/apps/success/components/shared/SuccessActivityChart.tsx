import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { SuccessEmptyState } from './SuccessStates'

interface SuccessActivityPoint {
  date: string
  workflows_started: number
  workflows_completed: number
}

interface SuccessActivityChartProps {
  title: string
  description: string
  startedLabel: string
  completedLabel: string
  emptyTitle: string
  emptyDescription: string
  data: SuccessActivityPoint[]
  'data-testid'?: string
}

export const SuccessActivityChart: React.FC<SuccessActivityChartProps> = ({
  title,
  description,
  startedLabel,
  completedLabel,
  emptyTitle,
  emptyDescription,
  data,
  'data-testid': testId = 'success-activity-chart'
}) => {
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      started: { label: startedLabel },
      completed: { label: completedLabel }
    }),
    [startedLabel, completedLabel]
  )

  const chartData = useMemo(
    () =>
      data.slice(-7).map(point => ({
        date: point.date,
        label: new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        started: point.workflows_started ?? 0,
        completed: point.workflows_completed ?? 0
      })),
    [data]
  )

  return (
    <Card className="gba:border-border gba:bg-background" data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gba:p-5">
        {!chartData.length ? (
          <SuccessEmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<TrendingUp className="gba:h-8 gba:w-8" />}
            data-testid={`${testId}-empty`}
          />
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[240px] gba:w-full" data-testid={`${testId}-chart`}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={28} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as { date?: string } | undefined
                  return point?.date ? new Date(point.date).toLocaleDateString() : ''
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="started"
                stroke="var(--color-started)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="var(--color-completed)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
