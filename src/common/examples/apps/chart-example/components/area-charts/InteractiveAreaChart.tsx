import React, { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconAvatar,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, CartesianGrid } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'
import areaChartData from '../../data/areaChartData.json'

interface InteractiveAreaChartProps {
  moduleColor?: string
}

const InteractiveAreaChart: React.FC<InteractiveAreaChartProps> = ({ moduleColor }) => {
  const chartData = areaChartData.interactive
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>('desktop')

  const chartConfig = useMemo(
    () =>
      ({
        // Data dimensions - used for area sizing only
        visitors: { label: 'Visitors', color: 'none' },
        // Visual categories - used for legend/colors
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' }
      }) satisfies ChartConfig,
    []
  )

  const total = useMemo(
    () => ({
      desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
      mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0)
    }),
    []
  )

  return (
    <Card data-testid="interactive-area-chart">
      <CardHeader className="gba:flex gba:flex-col gba:items-stretch gba:space-y-0 gba:border-b gba:p-0 gba:sm:flex-row">
        <div className="gba:flex gba:flex-1 gba:flex-col gba:justify-center gba:gap-1 gba:px-6 gba:py-5 gba:sm:py-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Area Chart - Interactive</CardTitle>
              <CardDescription>Showing total visitors for the last 3 months</CardDescription>
            </div>
          </div>
        </div>
        <div className="gba:flex">
          {['desktop', 'mobile'].map(key => {
            const chart = key as keyof typeof chartConfig
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className={`gba:relative gba:z-30 gba:flex gba:flex-1 gba:flex-col gba:justify-center gba:gap-1 gba:border-t gba:px-6 gba:py-4 gba:text-left gba:even:border-l gba:transition-all gba:cursor-pointer gba:hover:bg-muted/30 gba:sm:border-l gba:sm:border-t-0 gba:sm:px-8 gba:sm:py-6 ${activeChart === chart ? 'gba:bg-primary/10 gba:border-primary/20 gba:shadow-sm' : ''}`}
                onClick={() => setActiveChart(chart)}
              >
                <span
                  className={`gba:text-xs gba:transition-colors ${activeChart === chart ? 'gba:text-primary' : 'gba:text-muted-foreground'}`}
                >
                  {chartConfig[chart].label}
                </span>
                <span
                  className={`gba:text-lg gba:font-bold gba:leading-none gba:sm:text-3xl gba:transition-colors ${activeChart === chart ? 'gba:text-primary' : 'gba:text-foreground'}`}
                >
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="gba:px-2 gba:sm:p-6">
        <ChartContainer config={chartConfig} className="gba:aspect-auto gba:h-[250px] gba:w-full">
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={value => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })
              }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Area
              dataKey={activeChart}
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default InteractiveAreaChart
