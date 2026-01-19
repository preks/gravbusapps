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
import { PieChart, Pie, Cell } from 'recharts'
import { ChartPieSliceIcon } from '@phosphor-icons/react'
import pieChartData from '../../data/pieChartData.json'

interface InteractivePieChartProps {
  moduleColor?: string
}

const InteractivePieChart: React.FC<InteractivePieChartProps> = ({ moduleColor }) => {
  const chartData = pieChartData.interactive
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimension - used for pie sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        chrome: { label: 'Chrome' },
        safari: { label: 'Safari' },
        firefox: { label: 'Firefox' },
        edge: { label: 'Edge' },
        other: { label: 'Other' }
      }) satisfies ChartConfig,
    []
  )

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  return (
    <Card data-testid="interactive-pie-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Pie Chart - Interactive</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={5}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  fillOpacity={activeIndex === index ? 0.8 : 0.6}
                  stroke={activeIndex === index ? 'var(--color-border)' : 'none'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default InteractivePieChart
