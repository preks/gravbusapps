import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartConfig
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { ChartPieSliceIcon } from '@phosphor-icons/react'

interface NoTooltipProps {
  moduleColor?: string
}

const chartData = [
  { browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
  { browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
  { browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
  { browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
  { browser: 'other', visitors: 90, fill: 'var(--color-other)' }
]

const NoTooltip: React.FC<NoTooltipProps> = ({ moduleColor }) => {
  const chartConfig = useMemo(
    () =>
      ({
        visitors: { label: 'Visitors', color: 'none' },
        chrome: { label: 'Chrome' },
        safari: { label: 'Safari' },
        firefox: { label: 'Firefox' },
        edge: { label: 'Edge' },
        other: { label: 'Other' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="no-tooltip">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>No Tooltip</CardTitle>
          <CardDescription>Chart with tooltips disabled for cleaner presentation</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[200px]">
          <PieChart>
            {/* No ChartTooltip component = no tooltip */}
            <Pie data={chartData} dataKey="visitors" nameKey="browser" innerRadius={0} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default NoTooltip
