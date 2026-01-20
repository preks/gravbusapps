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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'
import areaChartData from '../../data/areaChartData.json'

interface AreaChartLegendProps {
  moduleColor?: string
}

const AreaChartLegend: React.FC<AreaChartLegendProps> = ({ moduleColor }) => {
  const chartData = areaChartData.legend

  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="area-chart-legend">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Legend</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default AreaChartLegend
