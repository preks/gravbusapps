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

interface AdvancedTooltipProps {
  moduleColor?: string
}

const chartData = [
  { month: 'January', desktop: 186, mobile: 80, tablet: 45 },
  { month: 'February', desktop: 305, mobile: 200, tablet: 120 },
  { month: 'March', desktop: 237, mobile: 120, tablet: 75 },
  { month: 'April', desktop: 73, mobile: 190, tablet: 95 },
  { month: 'May', desktop: 209, mobile: 130, tablet: 85 },
  { month: 'June', desktop: 214, mobile: 140, tablet: 90 }
]

const AdvancedTooltip: React.FC<AdvancedTooltipProps> = ({ moduleColor }) => {
  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' },
        tablet: { label: 'Tablet' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="advanced-tooltip">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Advanced Tooltip</CardTitle>
          <CardDescription>Advanced tooltip with multiple data series</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[200px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={value => (typeof value === 'string' ? value.slice(0, 3) : value)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
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
            <Area
              dataKey="tablet"
              type="natural"
              fill="var(--color-tablet)"
              fillOpacity={0.4}
              stroke="var(--color-tablet)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default AdvancedTooltip
