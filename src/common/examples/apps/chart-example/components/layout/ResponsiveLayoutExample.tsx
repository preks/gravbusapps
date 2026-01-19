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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'

interface ResponsiveLayoutExampleProps {
  moduleColor?: string
}

const performanceData = [
  { month: 'January', desktop: 186, mobile: 80, tablet: 45 },
  { month: 'February', desktop: 305, mobile: 200, tablet: 120 },
  { month: 'March', desktop: 237, mobile: 120, tablet: 75 },
  { month: 'April', desktop: 73, mobile: 190, tablet: 95 },
  { month: 'May', desktop: 209, mobile: 130, tablet: 85 },
  { month: 'June', desktop: 214, mobile: 140, tablet: 90 }
]

const ResponsiveLayoutExample: React.FC<ResponsiveLayoutExampleProps> = ({ moduleColor }) => {
  const chartConfig = useMemo(
    () =>
      ({
        desktop: { label: 'Desktop' },
        mobile: { label: 'Mobile' },
        tablet: { label: 'Tablet' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <div data-testid="responsive-layout-example">
      <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-3">
        {/* Main Chart - Takes full width on mobile, 2/3 on desktop */}
        <Card className="gba:col-span-1 gba:lg:col-span-2">
          <CardHeader className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Device usage trends across all platforms</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="gba:aspect-auto gba:w-full gba:h-[400px]">
              <AreaChart data={performanceData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={value => (typeof value === 'string' ? value.slice(0, 3) : value)}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="mobile"
                  type="natural"
                  fill="var(--color-mobile)"
                  fillOpacity={0.4}
                  stroke="var(--color-mobile)"
                  stackId="a"
                />
                <Area
                  dataKey="tablet"
                  type="natural"
                  fill="var(--color-tablet)"
                  fillOpacity={0.4}
                  stroke="var(--color-tablet)"
                  stackId="a"
                />
                <Area
                  dataKey="desktop"
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

        {/* Sidebar Metrics - Stacks vertically on mobile, sidebar on desktop */}
        <div className="gba:col-span-1 gba:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-lg">Desktop Usage</CardTitle>
              <CardDescription>Most popular platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:text-3xl gba:font-bold gba:text-primary">67%</div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="gba:text-lg">Mobile Growth</CardTitle>
              <CardDescription>Fastest growing segment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:text-3xl gba:font-bold gba:text-success">+24%</div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Year over year growth</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="gba:text-lg">Total Users</CardTitle>
              <CardDescription>All platforms combined</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:text-3xl gba:font-bold">1.2M</div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Active monthly users</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ResponsiveLayoutExample
