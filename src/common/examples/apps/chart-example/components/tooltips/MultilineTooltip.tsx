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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'

interface MultilineTooltipProps {
  moduleColor?: string
}

const chartData = [
  { month: 'January', desktop: 186, mobile: 80, tablet: 45 },
  { month: 'February', desktop: 305, mobile: 200, tablet: 120 },
  { month: 'March', desktop: 237, mobile: 120, tablet: 75 },
  { month: 'April', desktop: 73, mobile: 190, tablet: 95 },
  { month: 'May', desktop: 209, mobile: 130, tablet: 85 },
  { month: 'June', desktop: 214, mobile: 140, tablet: 90 }
]

const MultilineTooltip: React.FC<MultilineTooltipProps> = ({ moduleColor }) => {
  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop Users' },
        mobile: { label: 'Mobile Users' },
        tablet: { label: 'Tablet Users' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="multiline-tooltip">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
        <div>
          <CardTitle>Multiline Tooltip</CardTitle>
          <CardDescription>Tooltip displaying multiple data points with labels</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[200px]">
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={value => (typeof value === 'string' ? value.slice(0, 3) : value)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
            <Bar dataKey="tablet" fill="var(--color-tablet)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default MultilineTooltip
