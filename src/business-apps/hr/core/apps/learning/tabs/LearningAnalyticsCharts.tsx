import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'
import type { LearningAnalyticsModel } from './learningAnalyticsModel'

const funnelConfig = {
  value: { label: 'Learners', color: 'var(--nw-color-chart-1, var(--primary))' }
} as const

const trendConfig = {
  completed: { label: 'Completed', color: 'var(--nw-color-chart-1, var(--primary))' },
  passed: { label: 'Passed', color: 'var(--nw-color-chart-2, #22c55e)' }
} as const

const scoreConfig = {
  count: { label: 'Attempts', color: 'var(--nw-color-chart-3, var(--primary))' }
} as const

const timeConfig = {
  averageMinutes: { label: 'Average minutes', color: 'var(--nw-color-chart-4, var(--primary))' },
  limitMinutes: { label: 'Limit minutes', color: 'var(--nw-color-chart-5, #f59e0b)' }
} as const

interface AnalyticsChartProps {
  title: string
  emptyLabel: string
}

const EmptyChart: React.FC<{ label: string }> = ({ label }) => (
  <p className="gba:py-12 gba:text-center gba:text-sm gba:text-muted-foreground">{label}</p>
)

export const CompletionFunnelChart: React.FC<
  AnalyticsChartProps & { data: LearningAnalyticsModel['funnel']; labelFor: (key: string) => string }
> = ({ title, emptyLabel, data, labelFor }) => {
  const chartData = data.map(item => ({ ...item, label: labelFor(item.labelKey) }))
  return (
    <Card data-testid="learning-analytics-funnel-chart">
      <CardHeader>
        <CardTitle className="gba:text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.every(item => item.value === 0) ? (
          <EmptyChart label={emptyLabel} />
        ) : (
          <ChartContainer config={funnelConfig} className="gba:h-[213px] gba:w-full gba:aspect-auto">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
              <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export const CompletionTrendChart: React.FC<AnalyticsChartProps & { data: LearningAnalyticsModel['trend'] }> = ({
  title,
  emptyLabel,
  data
}) => (
  <Card data-testid="learning-analytics-trend-chart">
    <CardHeader>
      <CardTitle className="gba:text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <EmptyChart label={emptyLabel} />
      ) : (
        <ChartContainer config={trendConfig} className="gba:h-[213px] gba:w-full gba:aspect-auto">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
            <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
            <Legend />
            <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="passed" stroke="var(--color-passed)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      )}
    </CardContent>
  </Card>
)

export const ScoreHistogramChart: React.FC<
  AnalyticsChartProps & { data: LearningAnalyticsModel['scoreHistogram'] }
> = ({ title, emptyLabel, data }) => (
  <Card data-testid="learning-analytics-score-chart">
    <CardHeader>
      <CardTitle className="gba:text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {data.every(item => item.count === 0) ? (
        <EmptyChart label={emptyLabel} />
      ) : (
        <ChartContainer config={scoreConfig} className="gba:h-[213px] gba:w-full gba:aspect-auto">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
            <ChartTooltip content={<ChartTooltipContent labelKey="bucket" />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </CardContent>
  </Card>
)

export const TimeComparisonChart: React.FC<AnalyticsChartProps & { data: LearningAnalyticsModel['timeByCourse'] }> = ({
  title,
  emptyLabel,
  data
}) => (
  <Card data-testid="learning-analytics-time-chart">
    <CardHeader>
      <CardTitle className="gba:text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <EmptyChart label={emptyLabel} />
      ) : (
        <ChartContainer config={timeConfig} className="gba:h-[213px] gba:w-full gba:aspect-auto">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="courseTitle" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
            <ChartTooltip content={<ChartTooltipContent labelKey="courseTitle" />} />
            <Legend />
            <Bar dataKey="averageMinutes" fill="var(--color-averageMinutes)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="limitMinutes" fill="var(--color-limitMinutes)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </CardContent>
  </Card>
)
