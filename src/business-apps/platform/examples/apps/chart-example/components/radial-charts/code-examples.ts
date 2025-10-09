export const simpleRadialCode = `import React, { useMemo } from "react";
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
import { RadialBarChart, RadialBar } from "recharts";
import { CircleHalfIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
];

const SimpleRadialChart = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    // Data dimension - used for bar sizing only
    visitors: { label: "Visitors", color: "none" },
    // Visual categories - used for legend/colors
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Simple</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[250px]"
        >
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar dataKey="visitors" background />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const radialTextCode = `import React, { useMemo } from "react";
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
import { RadialBarChart, RadialBar } from "recharts";
import { CircleHalfIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
];

const RadialChartText = ({ moduleColor }) => {
  const totalVisitors = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, []);

  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Text</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[250px] gba:relative"
        >
          <RadialBarChart data={chartData} innerRadius={60} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar dataKey="visitors" background />
          </RadialBarChart>
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
            <div className="gba:text-center">
              <div className="gba:text-2xl gba:font-bold">{totalVisitors.toLocaleString()}</div>
              <div className="gba:text-muted-foreground gba:text-sm">Visitors</div>
            </div>
          </div>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const radialLabelCode = `import React, { useMemo } from "react";
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
import { RadialBarChart, RadialBar } from "recharts";
import { CircleHalfIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
];

const RadialChartLabel = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Label</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[250px]"
        >
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar dataKey="visitors" background />
            <ChartLegend content={<ChartLegendContent nameKey="browser" />} />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const radialGridCode = `import React, { useMemo } from "react";
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
import { RadialBarChart, RadialBar, PolarGrid } from "recharts";
import { CircleHalfIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
];

const RadialChartGrid = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Grid</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[250px]"
        >
          <RadialBarChart data={chartData} innerRadius={40} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <PolarGrid
              gridType="circle"
              polarRadius={[50, 70, 90, 110]}
            />
            <RadialBar dataKey="visitors" cornerRadius={10} />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const radialStackedCode = `import React, { useMemo } from "react";
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
import { RadialBarChart, RadialBar } from "recharts";
import { CircleHalfIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
];

const RadialChartStacked = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Stacked</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[250px]"
        >
          <RadialBarChart data={chartData} innerRadius={20} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar dataKey="visitors" background />
            <ChartLegend content={<ChartLegendContent nameKey="browser" />} />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const radialShapeCode = `import React, { useMemo } from "react";
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
import { RadialBarChart, RadialBar } from "recharts";
import { CircleHalfIcon } from "@phosphor-icons/react";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
];

const RadialChartShape = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    visitors: { label: "Visitors", color: "none" },
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={CircleHalfIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Radial Chart - Shape</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-0">
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto gba:aspect-square gba:max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            innerRadius={30}
            outerRadius={110}
            startAngle={90}
            endAngle={450}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar
              dataKey="visitors"
              cornerRadius={20}
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`
