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
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartLineIcon } from '@phosphor-icons/react'
import lineChartData from '../../data/lineChartData.json'

interface CustomDotsLineChartProps {
  moduleColor?: string
}

const CustomDotsLineChart: React.FC<CustomDotsLineChartProps> = ({ moduleColor }) => {
  const chartData = lineChartData.customDots

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="custom-dots-line-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Line Chart - Custom Dots</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
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
            <Line
              type="monotone"
              dataKey="desktop"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-desktop)',
                strokeWidth: 2,
                r: 4
              }}
              activeDot={{
                r: 6
              }}
            />
            <Line
              type="monotone"
              dataKey="mobile"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-mobile)',
                strokeWidth: 2,
                r: 4
              }}
              activeDot={{
                r: 6
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default CustomDotsLineChart
