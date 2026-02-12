import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
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
  Cell,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts'
import type { AnalysisChart as AnalysisChartType } from '../../types/nexus.types'

interface AnalysisChartProps {
  chart: AnalysisChartType
  testId?: string
}

const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)'
]

export const AnalysisChart = ({ chart, testId = 'nexus-chart' }: AnalysisChartProps) => {
  const chartConfig = useMemo<ChartConfig>(() => {
    if (chart.type === 'pie') {
      const config: ChartConfig = {}
      chart.data.forEach((item, i) => {
        const name = String(item[chart.xKey] || `item-${i}`)
        config[name] = {
          label: name,
          color: CHART_COLORS[i % CHART_COLORS.length]
        }
      })
      return config
    }

    return {
      [chart.yKey]: {
        label: chart.yKey,
        color: CHART_COLORS[0]
      }
    }
  }, [chart])

  return (
    <Card className="gba:overflow-hidden" data-testid={testId}>
      <CardHeader className="gba:pb-2 gba:px-5 gba:pt-5">
        <CardTitle className="gba:text-sm gba:font-semibold">{chart.title}</CardTitle>
        {chart.description && (
          <CardDescription className="gba:text-xs gba:leading-relaxed">{chart.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="gba:px-5 gba:pb-5">
        <ChartContainer config={chartConfig} className="gba:h-[280px] gba:w-full">
          {chart.type === 'bar' ? (
            <BarChart data={chart.data as any[]} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={chart.yKey} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chart.type === 'line' ? (
            <LineChart data={chart.data as any[]} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey={chart.yKey}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS[0] }}
              />
            </LineChart>
          ) : chart.type === 'area' ? (
            <AreaChart data={chart.data as any[]} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey={chart.yKey}
                fill={CHART_COLORS[0]}
                fillOpacity={0.3}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chart.data as any[]}
                dataKey={chart.yKey}
                nameKey={chart.xKey}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {(chart.data as any[]).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey={chart.xKey} />} />
            </PieChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
