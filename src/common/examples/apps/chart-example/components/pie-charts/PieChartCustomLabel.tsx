import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'
import { ChartPieSliceIcon } from '@phosphor-icons/react'
import pieChartData from '../../data/pieChartData.json'

interface PieChartCustomLabelProps {
  moduleColor?: string
}

const PieChartCustomLabel: React.FC<PieChartCustomLabelProps> = ({ moduleColor }) => {
  const chartData = pieChartData.customLabel

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimension - no color needed (used for dataKey only)
        visitors: {
          label: 'Visitors',
          color: 'none'
        },
        // Visual categories - get automatic colors (used for legend)
        chrome: { label: 'Chrome' },
        safari: { label: 'Safari' },
        firefox: { label: 'Firefox' },
        edge: { label: 'Edge' },
        other: { label: 'Other' }
      }) satisfies ChartConfig,
    []
  )

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="gba:fill-background gba:text-xs gba:font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card data-testid="pie-chart-custom-label">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Pie Chart - Custom Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="browser" />} />
            <Pie data={chartData} dataKey="visitors" nameKey="browser" labelLine={false} label={renderCustomizedLabel}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default PieChartCustomLabel
