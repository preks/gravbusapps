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
  SectionKpiCards
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, RadialBarChart, RadialBar } from 'recharts'
import { TrendUpIcon, ChartPieSliceIcon, ChartBarIcon, CircleHalfIcon } from '@phosphor-icons/react'

interface DashboardLayoutExampleProps {
  moduleColor?: string
}

// Various data sets for dashboard
const revenueData = [
  { month: 'Jan', revenue: 4000 },
  { month: 'Feb', revenue: 3000 },
  { month: 'Mar', revenue: 5000 },
  { month: 'Apr', revenue: 4500 },
  { month: 'May', revenue: 6000 },
  { month: 'Jun', revenue: 5500 }
]

const categoryData = [
  { category: 'Products', value: 400, fill: 'var(--color-products)' },
  { category: 'Services', value: 300, fill: 'var(--color-services)' },
  { category: 'Support', value: 200, fill: 'var(--color-support)' }
]

const performanceData = [
  { metric: 'Sales', current: 85, target: 100, fill: 'var(--color-sales)' },
  { metric: 'Marketing', current: 92, target: 100, fill: 'var(--color-marketing)' },
  { metric: 'Support', current: 78, target: 100, fill: 'var(--color-support)' }
]

const DashboardLayoutExample: React.FC<DashboardLayoutExampleProps> = ({ moduleColor }) => {
  // KPI data for SectionKpiCards
  const kpiData = useMemo(
    () => [
      {
        id: 'revenue',
        title: 'Total Revenue',
        value: '$45,231.89',
        prefix: <TrendUpIcon />,
        color: '#1890ff',
        description: '+20.1% from last month'
      },
      {
        id: 'customers',
        title: 'New Customers',
        value: '+2,350',
        prefix: <ChartBarIcon />,
        color: '#52c41a',
        description: '+180.1% from last month'
      },
      {
        id: 'projects',
        title: 'Active Projects',
        value: '12,234',
        prefix: <ChartPieSliceIcon />,
        color: '#faad14',
        description: '+19% from last month'
      },
      {
        id: 'completion',
        title: 'Completion Rate',
        value: '85%',
        prefix: <CircleHalfIcon />,
        color: '#722ed1',
        description: '+3% from last month'
      }
    ],
    []
  )

  const revenueConfig = useMemo(
    () =>
      ({
        revenue: { label: 'Revenue' }
      }) satisfies ChartConfig,
    []
  )

  const categoryConfig = useMemo(
    () =>
      ({
        products: { label: 'Products' },
        services: { label: 'Services' },
        support: { label: 'Support' }
      }) satisfies ChartConfig,
    []
  )

  const performanceConfig = useMemo(
    () =>
      ({
        current: { label: 'Current' },
        sales: { label: 'Sales' },
        marketing: { label: 'Marketing' },
        support: { label: 'Support' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <div data-testid="dashboard-layout-example">
      {/* Top Row - KPI Cards */}
      <div className="gba:mb-6">
        <SectionKpiCards cards={kpiData} data-testid="dashboard-kpi-cards" />
      </div>

      {/* Main Content Row */}
      <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-3">
        {/* Revenue Trend - Takes 2/3 width */}
        <Card className="gba:col-span-1 gba:lg:col-span-2">
          <CardHeader className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over time</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="gba:w-full gba:aspect-auto gba:h-[300px]">
              <LineChart data={revenueData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={3} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Distribution - Takes 1/3 width */}
        <Card>
          <CardHeader className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor as any} size="md" decorative />
            <div>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Distribution breakdown</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:pb-0">
            <ChartContainer config={categoryConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="category" />} />
                <Pie data={categoryData} dataKey="value" nameKey="category" innerRadius={60} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Performance Metrics */}
      <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-3 gba:mt-6">
        {performanceData.map(item => (
          <Card key={item.metric}>
            <CardHeader className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={CircleHalfIcon} variant={moduleColor as any} size="sm" decorative />
              <div>
                <CardTitle className="gba:text-base">{item.metric} Performance</CardTitle>
                <CardDescription>{item.current}% of target</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="gba:flex-1 gba:pb-0">
              <ChartContainer config={performanceConfig} className="gba:mx-auto gba:aspect-square gba:max-h-[150px]">
                <RadialBarChart data={[item]} innerRadius={30} outerRadius={80}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="metric" />} />
                  <RadialBar dataKey="current" cornerRadius={10} />
                </RadialBarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DashboardLayoutExample
