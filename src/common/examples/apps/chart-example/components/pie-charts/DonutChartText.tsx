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
import { PieChart, Pie } from 'recharts'
import { CircleHalfIcon } from '@phosphor-icons/react'
import pieChartData from '../../data/pieChartData.json'

interface DonutChartTextProps {
  moduleColor?: string
}

const DonutChartText: React.FC<DonutChartTextProps> = ({ moduleColor }) => {
  const chartData = pieChartData.donutText

  const totalVisitors = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [chartData])

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

  return (
    <Card data-testid="donut-chart-text">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Donut Chart - Text</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="visitors" nameKey="browser" innerRadius={60} strokeWidth={5} />
            {/* Center text */}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="gba:fill-foreground gba:text-2xl gba:font-bold"
            >
              {totalVisitors.toLocaleString()}
            </text>
            <text
              x="50%"
              y="50%"
              dy="1.5em"
              textAnchor="middle"
              dominantBaseline="middle"
              className="gba:fill-muted-foreground gba:text-sm"
            >
              Visitors
            </text>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default DonutChartText
