export const gridLayoutCode = `import React, { useMemo } from "react";
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
  ChartLegendContent,
} from "@newwork/nw-design-system";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { ChartPieSliceIcon, ChartBarIcon, TrendUpIcon } from "@phosphor-icons/react";

const GridLayoutExample = ({ moduleColor }) => {
  // Sample data for different charts
  const salesData = [
    { region: "North", sales: 4000, fill: "var(--color-north)" },
    { region: "South", sales: 3000, fill: "var(--color-south)" },
    { region: "East", sales: 2000, fill: "var(--color-east)" },
    { region: "West", sales: 2780, fill: "var(--color-west)" },
  ];

  const monthlyData = [
    { month: "Jan", revenue: 4000, costs: 2400 },
    { month: "Feb", revenue: 3000, costs: 1398 },
    { month: "Mar", revenue: 2000, costs: 9800 },
    { month: "Apr", revenue: 2780, costs: 3908 },
    { month: "May", revenue: 1890, costs: 4800 },
    { month: "Jun", revenue: 2390, costs: 3800 },
  ];

  const trendData = [
    { month: "Jan", visitors: 186 },
    { month: "Feb", visitors: 305 },
    { month: "Mar", visitors: 237 },
    { month: "Apr", visitors: 273 },
    { month: "May", visitors: 209 },
    { month: "Jun", visitors: 214 },
  ];

  const salesConfig = useMemo(() => ({
    north: { label: "North" },
    south: { label: "South" },
    east: { label: "East" },
    west: { label: "West" },
  }) satisfies ChartConfig, []);

  const monthlyConfig = useMemo(() => ({
    revenue: { label: "Revenue" },
    costs: { label: "Costs" },
  }) satisfies ChartConfig, []);

  const trendConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
  }) satisfies ChartConfig, []);

  return (
    <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
      {/* Sales by Region - Pie Chart */}
      <Card className="gba:col-span-1">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor} size="md" decorative />
          <div>
            <CardTitle>Sales by Region</CardTitle>
            <CardDescription>Q1 2024 distribution</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:pb-0">
          <ChartContainer
            config={salesConfig}
            className="gba:mx-auto gba:aspect-square gba:max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="region" />}
              />
              <Pie
                data={salesData}
                dataKey="sales"
                nameKey="region"
                innerRadius={0}
              />
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
          <IconAvatar icon={ChartBarIcon} variant={moduleColor} size="md" decorative />
          <div>
            <CardTitle>Monthly Performance</CardTitle>
            <CardDescription>Revenue vs Costs</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyConfig} className="gba:h-[250px]">
            <BarChart data={monthlyData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
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
          <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
          <div>
            <CardTitle>Visitor Trends</CardTitle>
            <CardDescription>Monthly website visitors</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="gba:h-[250px]">
            <LineChart data={trendData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                dataKey="visitors"
                type="monotone"
                stroke="var(--color-visitors)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-visitors)",
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};`

export const responsiveLayoutCode = `import React, { useMemo } from "react";
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
} from "@newwork/nw-design-system";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendUpIcon } from "@phosphor-icons/react";

const ResponsiveLayoutExample = ({ moduleColor }) => {
  const performanceData = [
    { month: "January", desktop: 186, mobile: 80, tablet: 45 },
    { month: "February", desktop: 305, mobile: 200, tablet: 120 },
    { month: "March", desktop: 237, mobile: 120, tablet: 75 },
    { month: "April", desktop: 73, mobile: 190, tablet: 95 },
    { month: "May", desktop: 209, mobile: 130, tablet: 85 },
    { month: "June", desktop: 214, mobile: 140, tablet: 90 },
  ];

  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
    tablet: { label: "Tablet" },
  }) satisfies ChartConfig, []);

  return (
    <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-3">
      {/* Main Chart - Takes full width on mobile, 2/3 on desktop */}
      <Card className="gba:col-span-1 gba:lg:col-span-2">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
          <div>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Device usage trends across all platforms</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="gba:h-[400px]">
            <AreaChart data={performanceData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
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
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg">Mobile Growth</CardTitle>
            <CardDescription>Fastest growing segment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:text-success">+24%</div>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
              Year over year growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg">Total Users</CardTitle>
            <CardDescription>All platforms combined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold">1.2M</div>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
              Active monthly users
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};`

export const dashboardLayoutCode = `// Complete dashboard layout with KPI cards, main chart, and performance metrics
// This example shows a comprehensive dashboard structure with:
// - Top row: 4 KPI cards with icons and metrics
// - Middle row: Main revenue chart (2/3 width) + category pie chart (1/3 width)
// - Bottom row: 3 radial performance charts
//
// Responsive design:
// - Mobile: All elements stack vertically
// - Tablet: 2 columns where appropriate
// - Desktop: Full grid layout with proper column spanning
//
// Key features:
// - IconAvatar with moduleColor theming
// - ChartContainer with automatic color generation
// - Mixed chart types (Line, Pie, RadialBar)
// - Consistent design system integration
// - Proper responsive grid layout

// See full implementation in DashboardLayoutExample.tsx`
