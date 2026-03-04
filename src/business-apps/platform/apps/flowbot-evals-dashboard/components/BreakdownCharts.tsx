import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { PieChart, Pie, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { BreakdownItem } from '../types'

const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)'
]

export interface BreakdownChartsProps {
  errorBreakdown: BreakdownItem[]
  toolBreakdown: BreakdownItem[]
  'data-testid'?: string
}

export function BreakdownCharts({
  errorBreakdown,
  toolBreakdown,
  'data-testid': testId = 'flowbot-evals-breakdowns'
}: Readonly<BreakdownChartsProps>) {
  const errorData = useMemo(() => errorBreakdown.slice(0, 8), [errorBreakdown])
  const errorChartData = useMemo(
    () =>
      errorData.map((item, i) => ({
        ...item,
        color: CHART_COLORS[i % CHART_COLORS.length]
      })),
    [errorData]
  )
  const toolData = useMemo(() => toolBreakdown.slice(0, 10), [toolBreakdown])

  const errorConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {}
    errorChartData.forEach(item => {
      cfg[item.key] = { label: item.key, color: (item as any).color }
    })
    return cfg
  }, [errorChartData])

  const toolConfig = useMemo<ChartConfig>(
    () => ({
      count: { label: 'Count' }
    }),
    []
  )

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2" data-testid={testId}>
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Error breakdown (top)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={errorConfig} className="gba:h-64 gba:w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={errorChartData as any[]}
                dataKey="count"
                nameKey="key"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                shape={(props: any) => <Sector {...props} fill={props?.payload?.color} />}
              />
              <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Tool usage (top)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={toolConfig} className="gba:h-64 gba:w-full">
            <BarChart data={toolData as any[]} layout="vertical" margin={{ left: 24, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis
                type="category"
                dataKey="key"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={140}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default BreakdownCharts
