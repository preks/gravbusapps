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
import { PieChart, Pie, LabelList } from 'recharts'
import { ChartPieSliceIcon } from '@phosphor-icons/react'
import pieChartData from '../../data/pieChartData.json'

interface PieChartLabelListProps {
  moduleColor?: string
}

const PieChartLabelList: React.FC<PieChartLabelListProps> = ({ moduleColor }) => {
  const chartData = pieChartData.labelList

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimension - no color needed (used for dataKey only)
        visitors: {
          label: 'Visitors',
          color: 'none'
        },
        // Visual categories - get automatic colors (used for legend)
        chrome: { label: 'Chrome' },
        safari: { label: 'Safari' },
        firefox: { label: 'Firefox' },
        edge: { label: 'Edge' },
        other: { label: 'Other' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="pie-chart-label-list">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Pie Chart - Label List</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="browser" />} />
            <Pie data={chartData} dataKey="visitors" nameKey="browser">
              <LabelList
                dataKey="browser"
                className="gba:fill-background"
                stroke="none"
                fontSize={12}
                formatter={(value: string) => chartConfig[value as keyof typeof chartConfig]?.label}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default PieChartLabelList
