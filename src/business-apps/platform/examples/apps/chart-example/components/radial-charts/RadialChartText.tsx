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
import { RadialBarChart, RadialBar } from 'recharts'
import { CircleHalfIcon } from '@phosphor-icons/react'
import radialChartData from '../../data/radialChartData.json'

interface RadialChartTextProps {
  moduleColor?: string
}

const RadialChartText: React.FC<RadialChartTextProps> = ({ moduleColor }) => {
  const chartData = radialChartData.text

  const totalVisitors = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [chartData])

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimension - used for bar sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        chrome: { label: 'Chrome' },
        safari: { label: 'Safari' },
        firefox: { label: 'Firefox' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="radial-chart-text">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Text</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <div className="gba:relative">
          <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
            <RadialBarChart data={chartData} innerRadius={60} outerRadius={110}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="browser" />} />
              <RadialBar dataKey="visitors" background />
            </RadialBarChart>
          </ChartContainer>
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
            <div className="gba:text-center">
              <div className="gba:text-2xl gba:font-bold">{totalVisitors.toLocaleString()}</div>
              <div className="gba:text-muted-foreground gba:text-sm">Visitors</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RadialChartText
