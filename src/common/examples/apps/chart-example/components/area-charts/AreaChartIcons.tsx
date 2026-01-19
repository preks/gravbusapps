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
import { TrendUpIcon, DesktopIcon, DeviceMobileIcon } from '@phosphor-icons/react'
import areaChartData from '../../data/areaChartData.json'

interface AreaChartIconsProps {
  moduleColor?: string
}

const AreaChartIcons: React.FC<AreaChartIconsProps> = ({ moduleColor }) => {
  const chartData = areaChartData.icons

  const chartConfig = useMemo(
    () =>
      ({
        visitors: { label: 'Visitors', color: 'none' },
        chrome: {
          label: 'Chrome',
          icon: DesktopIcon
        },
        safari: {
          label: 'Safari',
          icon: DeviceMobileIcon
        },
        firefox: { label: 'Firefox' },
        edge: { label: 'Edge' },
        other: { label: 'Other' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="area-chart-icons">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Icons</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="browser" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="browser" />} />
            <Area
              dataKey="visitors"
              type="natural"
              fill="var(--color-visitors)"
              fillOpacity={0.4}
              stroke="var(--color-visitors)"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default AreaChartIcons
