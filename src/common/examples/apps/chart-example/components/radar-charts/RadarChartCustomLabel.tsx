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

interface RadarChartCustomLabelProps {
  moduleColor?: string
}

const RadarChartCustomLabel: React.FC<RadarChartCustomLabelProps> = ({ moduleColor }) => {
  const chartData = radarChartData.customLabel

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
    <Card data-testid="radar-chart-custom-label">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleWavyIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Radar Chart - Custom Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid />
            <PolarAngleAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'var(--foreground)' }}
              className="gba:text-xs gba:fill-foreground"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 350]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickCount={5}
              className="gba:fill-muted-foreground gba:text-xs"
            />
            <Radar
              dataKey="desktop"
              stroke="var(--color-desktop)"
              fill="var(--color-desktop)"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 4, fillOpacity: 1 }}
            />
            <Radar
              dataKey="mobile"
              stroke="var(--color-mobile)"
              fill="var(--color-mobile)"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 4, fillOpacity: 1 }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default RadarChartCustomLabel
