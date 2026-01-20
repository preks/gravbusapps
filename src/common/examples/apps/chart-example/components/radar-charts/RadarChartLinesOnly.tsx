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
import { RadarChart, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { CircleWavyIcon } from '@phosphor-icons/react'
import radarChartData from '../../data/radarChartData.json'

interface RadarChartLinesOnlyProps {
  moduleColor?: string
}

const RadarChartLinesOnly: React.FC<RadarChartLinesOnlyProps> = ({ moduleColor }) => {
  const chartData = radarChartData.linesOnly

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - no color needed (used for dataKey only)
        visitors: {
          label: 'Visitors',
          color: 'none'
        },
        // Visual categories - get automatic colors (used for legend)
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="radar-chart-lines-only">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleWavyIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Radar Chart - Lines Only</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarRadiusAxis className="gba:fill-muted-foreground gba:text-xs" />
            <Radar dataKey="desktop" stroke="var(--color-desktop)" fill="transparent" strokeWidth={2} dot={false} />
            <Radar dataKey="mobile" stroke="var(--color-mobile)" fill="transparent" strokeWidth={2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default RadarChartLinesOnly
