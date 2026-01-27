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

interface StackedExpandedAreaChartProps {
  moduleColor?: string
}

const StackedExpandedAreaChart: React.FC<StackedExpandedAreaChartProps> = ({ moduleColor }) => {
  const chartData = areaChartData.stackedExpanded

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for area sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' },
        tablet: { label: 'Tablet' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="stacked-expanded-area-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Stacked Expanded</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            stackOffset="expand"
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
            <YAxis tickFormatter={value => `${(value * 100).toFixed(0)}%`} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
              formatter={(value, name) => [`${((value as number) * 100).toFixed(1)}%`, name]}
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="tablet"
              type="natural"
              fill="var(--color-tablet)"
              fillOpacity={0.4}
              stroke="var(--color-tablet)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default StackedExpandedAreaChart
