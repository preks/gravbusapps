export const simpleAreaCode = `import React, { useMemo } from "react";
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

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const SimpleAreaChart = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Simple</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
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
  );
};`

export const stackedAreaCode = `import React, { useMemo } from "react";
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

const chartData = [
  { month: "January", desktop: 186, mobile: 80, tablet: 45 },
  { month: "February", desktop: 305, mobile: 200, tablet: 120 },
  { month: "March", desktop: 237, mobile: 120, tablet: 75 },
  { month: "April", desktop: 73, mobile: 190, tablet: 95 },
  { month: "May", desktop: 209, mobile: 130, tablet: 85 },
  { month: "June", desktop: 214, mobile: 140, tablet: 90 },
];

const StackedAreaChart = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
    tablet: { label: "Tablet" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Stacked</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
  );
};`

export const areaLegendCode = `import React, { useMemo } from "react";
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendUpIcon } from "@phosphor-icons/react";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const AreaChartLegend = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Legend</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
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
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const areaIconsCode = `import React, { useMemo } from "react";
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendUpIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const AreaChartIcons = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
    edge: { label: "Edge" },
    other: { label: "Other" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Icons</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="browser"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="visitors"
              type="natural"
              fill="var(--color-chrome)"
              fillOpacity={0.4}
              stroke="var(--color-chrome)"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const areaGradientCode = `import React, { useMemo } from "react";
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

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const AreaChartGradient = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Area Chart - Gradient</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[300px]">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const interactiveAreaCode = `import React, { useMemo, useState } from "react";
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
  ChartTooltipContent,
} from "@newwork/nw-design-system";
import { AreaChart, Area, XAxis, CartesianGrid } from "recharts";
import { TrendUpIcon } from "@phosphor-icons/react";

const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  // ... more data points
];

const InteractiveAreaChart = ({ moduleColor }) => {
  const [activeChart, setActiveChart] = useState("desktop");

  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  const total = useMemo(() => ({
    desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
    mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0),
  }), []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:flex-col gba:items-stretch gba:space-y-0 gba:border-b gba:p-0 gba:sm:flex-row">
        <div className="gba:flex gba:flex-1 gba:flex-col gba:justify-center gba:gap-1 gba:px-6 gba:py-5 gba:sm:py-6">
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
            <div>
              <CardTitle>Area Chart - Interactive</CardTitle>
              <CardDescription>Showing total visitors for the last 3 months</CardDescription>
            </div>
          </div>
        </div>
        <div className="gba:flex">
          {["desktop", "mobile"].map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="gba:relative gba:z-30 gba:flex gba:flex-1 gba:flex-col gba:justify-center gba:gap-1 gba:border-t gba:px-6 gba:py-4 gba:text-left gba:even:border-l data-[active=true]:gba:bg-muted/50 gba:sm:border-l gba:sm:border-t-0 gba:sm:px-8 gba:sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="gba:text-xs gba:text-muted-foreground">
                {chartConfig[key].label}
              </span>
              <span className="gba:text-lg gba:font-bold gba:leading-none gba:sm:text-3xl">
                {total[key].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="gba:px-2 gba:sm:p-6">
        <ChartContainer config={chartConfig} className="gba:aspect-auto gba:h-[250px] gba:w-full">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
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
  );
};`

export const linearAreaCode = `// Linear area chart with linear interpolation between data points`

export const stepAreaCode = `// Step area chart with step-wise connections between data points`

export const stackedExpandedAreaCode = `// 100% stacked area chart showing proportions with percentage formatting`

export const areaAxesCode = `// Area chart with custom axis styling, tick formatting, and grid configuration`
