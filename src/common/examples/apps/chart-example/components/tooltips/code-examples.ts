export const defaultTooltipCode = `import React, { useMemo } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendUpIcon } from "@phosphor-icons/react";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const DefaultTooltip = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Default Tooltip</CardTitle>
          <CardDescription>Hover over the chart to see the default tooltip</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[200px]">
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
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
            <Line
              dataKey="desktop"
              type="monotone"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="mobile"
              type="monotone"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const customTooltipCode = `import React, { useMemo } from "react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartBarIcon } from "@phosphor-icons/react";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const CustomTooltip = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop Users" },
    mobile: { label: "Mobile Users" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Custom Tooltip</CardTitle>
          <CardDescription>Hover over bars to see custom formatted tooltip</CardDescription>
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
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const advancedTooltipCode = `import React, { useMemo } from "react";
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

const AdvancedTooltip = ({ moduleColor }) => {
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
          <CardTitle>Advanced Tooltip</CardTitle>
          <CardDescription>Advanced tooltip with multiple data series</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[200px]">
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
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
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
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const noTooltipCode = `import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartConfig,
} from "@newwork/nw-design-system";
import { PieChart, Pie } from "recharts";
import { ChartPieSliceIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const NoTooltip = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
    edge: { label: "Edge" },
    other: { label: "Other" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieSliceIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>No Tooltip</CardTitle>
          <CardDescription>Chart with tooltips disabled for cleaner presentation</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[200px]"
        >
          <PieChart>
            {/* No ChartTooltip component = no tooltip */}
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={0}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const interactiveTooltipCode = `import React, { useMemo } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendUpIcon } from "@phosphor-icons/react";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const InteractiveTooltip = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Interactive Tooltip</CardTitle>
          <CardDescription>Tooltip with enhanced interactivity and animations</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:h-[200px]">
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
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
              cursor={{ strokeDasharray: "3 3" }}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="desktop"
              type="monotone"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-desktop)",
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
            />
            <Line
              dataKey="mobile"
              type="monotone"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-mobile)",
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const multilineTooltipCode = `import React, { useMemo } from "react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartBarIcon } from "@phosphor-icons/react";

const chartData = [
  { month: "January", desktop: 186, mobile: 80, tablet: 45 },
  { month: "February", desktop: 305, mobile: 200, tablet: 120 },
  { month: "March", desktop: 237, mobile: 120, tablet: 75 },
  { month: "April", desktop: 73, mobile: 190, tablet: 95 },
  { month: "May", desktop: 209, mobile: 130, tablet: 85 },
  { month: "June", desktop: 214, mobile: 140, tablet: 90 },
];

const MultilineTooltip = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop Users" },
    mobile: { label: "Mobile Users" },
    tablet: { label: "Tablet Users" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor} size="md" decorative />
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
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 3) : value}
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
  );
};`
