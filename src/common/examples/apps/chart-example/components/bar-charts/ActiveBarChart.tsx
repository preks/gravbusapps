import React, { useMemo, useState } from 'react'
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

interface ActiveBarChartProps {
  moduleColor?: string
}

const ActiveBarChart: React.FC<ActiveBarChartProps> = ({ moduleColor }) => {
  const chartData = barChartData.active
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for bar sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="active-bar-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Bar Chart - Active</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
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
            <Bar
              dataKey="desktop"
              strokeWidth={2}
              radius={8}
              fill="var(--color-desktop)"
              fillOpacity={index => (activeIndex === index ? 0.8 : 0.6)}
            />
            <Bar
              dataKey="mobile"
              strokeWidth={2}
              radius={8}
              fill="var(--color-mobile)"
              fillOpacity={index => (activeIndex === index ? 0.8 : 0.6)}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default ActiveBarChart
