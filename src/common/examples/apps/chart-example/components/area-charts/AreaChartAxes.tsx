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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'
import areaChartData from '../../data/areaChartData.json'

interface AreaChartAxesProps {
  moduleColor?: string
}

const AreaChartAxes: React.FC<AreaChartAxesProps> = ({ moduleColor }) => {
  const chartData = areaChartData.axes

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for area sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="area-chart-axes">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Axes</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={true}
              axisLine={true}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              tickFormatter={value => (typeof value === 'string' ? value.slice(0, 3) : value)}
            />
            <YAxis
              tickLine={true}
              axisLine={true}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              tickFormatter={value => `${value}`}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default AreaChartAxes
