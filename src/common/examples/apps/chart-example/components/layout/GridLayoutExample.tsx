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
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { ChartPieSliceIcon, ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react'

interface GridLayoutExampleProps {
  moduleColor?: string
}

// Sample data for different charts
const salesData = [
  { region: 'North', sales: 4000, fill: 'var(--color-north)' },
  { region: 'South', sales: 3000, fill: 'var(--color-south)' },
  { region: 'East', sales: 2000, fill: 'var(--color-east)' },
  { region: 'West', sales: 2780, fill: 'var(--color-west)' }
]

const monthlyData = [
  { month: 'Jan', revenue: 4000, costs: 2400 },
  { month: 'Feb', revenue: 3000, costs: 1398 },
  { month: 'Mar', revenue: 2000, costs: 9800 },
  { month: 'Apr', revenue: 2780, costs: 3908 },
  { month: 'May', revenue: 1890, costs: 4800 },
  { month: 'Jun', revenue: 2390, costs: 3800 }
]

const trendData = [
  { month: 'Jan', visitors: 186 },
  { month: 'Feb', visitors: 305 },
  { month: 'Mar', visitors: 237 },
  { month: 'Apr', visitors: 273 },
  { month: 'May', visitors: 209 },
  { month: 'Jun', visitors: 214 }
]

const GridLayoutExample: React.FC<GridLayoutExampleProps> = ({ moduleColor }) => {
  const salesConfig = useMemo(
    () =>
      ({
        north: { label: 'North' },
        south: { label: 'South' },
        east: { label: 'East' },
        west: { label: 'West' }
      }) satisfies ChartConfig,
    []
  )

  const monthlyConfig = useMemo(
    () =>
      ({
        revenue: { label: 'Revenue' },
        costs: { label: 'Costs' }
      }) satisfies ChartConfig,
    []
  )

  const trendConfig = useMemo(
    () =>
      ({
        visitors: { label: 'Visitors' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <div data-testid="grid-layout-example">
      <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
        {/* Sales by Region - Pie Chart */}
        <Card>
          <CardHeader className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Sales by Region</CardTitle>
              <CardDescription>Q1 2024 distribution</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesConfig} className="gba:mx-auto gba:aspect-square gba:w-full gba:max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="region" />} />
                <Pie data={salesData} dataKey="sales" nameKey="region" innerRadius={0} />
                <ChartLegend
                  content={<ChartLegendContent nameKey="region" />}
                  className="-gba:translate-y-2 gba:flex-wrap gba:gap-2 [&>*]:gba:basis-1/4 [&>*]:gba:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Performance - Bar Chart */}
        <Card className="gba:col-span-1">
          <CardHeader className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Revenue vs Costs</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyConfig} className="gba:w-full gba:h-[250px]">
              <BarChart data={monthlyData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="costs" fill="var(--color-costs)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Visitor Trends - Line Chart */}
        <Card className="gba:col-span-1">
          <CardHeader className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Visitor Trends</CardTitle>
              <CardDescription>Monthly website visitors</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="gba:w-full gba:h-[250px]">
              <LineChart data={trendData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line
                  dataKey="visitors"
                  type="monotone"
                  stroke="var(--color-visitors)"
                  strokeWidth={2}
                  dot={{
                    fill: 'var(--color-visitors)'
                  }}
                  activeDot={{
                    r: 6
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GridLayoutExample
