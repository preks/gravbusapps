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

interface RadarChartGridProps {
  moduleColor?: string
}

const RadarChartGrid: React.FC<RadarChartGridProps> = ({ moduleColor }) => {
  const chartData = radarChartData.simple

  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="radar-chart-grid">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleWavyIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Radar Chart - Grid</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarRadiusAxis domain={[0, 400]} tick={false} tickCount={6} />
            <PolarGrid gridType="polygon" radialLines={true} />
            <Radar
              dataKey="desktop"
              stroke="var(--color-desktop)"
              fill="var(--color-desktop)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              dataKey="mobile"
              stroke="var(--color-mobile)"
              fill="var(--color-mobile)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default RadarChartGrid
