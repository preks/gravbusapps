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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import { ChartLineIcon } from '@phosphor-icons/react'
import lineChartData from '../../data/lineChartData.json'

interface LineChartLabelProps {
  moduleColor?: string
}

const LineChartLabel: React.FC<LineChartLabelProps> = ({ moduleColor }) => {
  const chartData = lineChartData.label

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="line-chart-label">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartLineIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Line Chart - Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{
              top: 20,
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Line
              type="monotone"
              dataKey="desktop"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-desktop)'
              }}
              activeDot={{
                r: 6
              }}
            >
              <LabelList position="top" offset={12} className="gba:fill-foreground" fontSize={12} />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default LineChartLabel
