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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'
import barChartData from '../../data/barChartData.json'

interface VerticalBarChartProps {
  moduleColor?: string
}

const VerticalBarChart: React.FC<VerticalBarChartProps> = ({ moduleColor }) => {
  const chartData = barChartData.horizontal // Keep same data, just fix the layout

  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="vertical-bar-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Bar Chart - Vertical</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              type="category"
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={value => (typeof value === 'string' ? value.slice(0, 3) : value)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default VerticalBarChart
