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

interface DotsColorsLineChartProps {
  moduleColor?: string
}

const DotsColorsLineChart: React.FC<DotsColorsLineChartProps> = ({ moduleColor }) => {
  const chartData = lineChartData.dotsColors

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
    <Card data-testid="dots-colors-line-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Line Chart - Dots Colors</CardTitle>
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
              dot={{ fill: 'var(--color-desktop)' }}
              activeDot={{ r: 8, stroke: 'var(--color-desktop)', fill: 'var(--background)' }}
            />
            <Line
              type="monotone"
              dataKey="mobile"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-mobile)' }}
              activeDot={{ r: 8, stroke: 'var(--color-mobile)', fill: 'var(--background)' }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default DotsColorsLineChart
