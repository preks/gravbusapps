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
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { CircleWavyIcon } from '@phosphor-icons/react'
import radarChartData from '../../data/radarChartData.json'

interface RadarChartLabelProps {
  moduleColor?: string
}

const RadarChartLabel: React.FC<RadarChartLabelProps> = ({ moduleColor }) => {
  const chartData = radarChartData.customLabel

  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="radar-chart-label">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleWavyIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Radar Chart - Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" className="gba:text-xs" />
            <PolarRadiusAxis angle={90} domain={[0, 400]} tick={false} tickCount={6} />
            <PolarGrid />
            <Radar
              dataKey="desktop"
              stroke="var(--color-desktop)"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1
              }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default RadarChartLabel
