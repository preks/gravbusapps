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
import { RadialBarChart, RadialBar } from 'recharts'
import { CircleHalfIcon } from '@phosphor-icons/react'
import radialChartData from '../../data/radialChartData.json'

interface RadialChartLabelProps {
  moduleColor?: string
}

const RadialChartLabel: React.FC<RadialChartLabelProps> = ({ moduleColor }) => {
  const chartData = radialChartData.label

  const chartConfig = useMemo(
    () =>
      ({
        visitors: { label: 'Visitors', color: 'none' },
        chrome: { label: 'Chrome' },
        safari: { label: 'Safari' },
        firefox: { label: 'Firefox' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="radial-chart-label">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={110}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="visitors" nameKey="browser" />} />
            <RadialBar dataKey="visitors" background />
            <ChartLegend content={<ChartLegendContent nameKey="browser" />} />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default RadialChartLabel
