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
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'
import barChartData from '../../data/barChartData.json'

interface MixedBarChartProps {
  moduleColor?: string
}

const MixedBarChart: React.FC<MixedBarChartProps> = ({ moduleColor }) => {
  const chartData = barChartData.mixed

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for bar sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' },
        tablet: { label: 'Tablet' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="mixed-bar-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Bar Chart - Mixed</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={value => (typeof value === 'string' ? value.slice(0, 3) : value)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
            <Line
              type="monotone"
              dataKey="tablet"
              stroke="var(--color-tablet)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-tablet)' }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default MixedBarChart
