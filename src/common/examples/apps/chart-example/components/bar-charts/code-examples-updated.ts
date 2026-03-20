export const simpleBarCode = `import React, { useMemo } from "react";
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

const SimpleBarChart = ({ moduleColor }) => {
  const chartConfig = useMemo(() => ({
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
  }) satisfies ChartConfig, []);

  return (
    <Card>
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant={moduleColor} size="md" decorative />
        <div>
          <CardTitle>Bar Chart - Simple</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const horizontalBarCode = `// Horizontal bar chart implementation`
export const multipleBarCode = `// Multiple series bar chart implementation`
export const stackedBarCode = `// Stacked bar chart implementation`
export const barLabelCode = `// Bar chart with labels implementation`
export const negativeBarCode = `// Bar chart with negative values implementation`

export const interactiveBarCode = `import React, { useMemo, useState } from "react";
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
import { BarChart, Bar, XAxis, CartesianGrid } from "recharts";
import { ChartBarIcon } from "@phosphor-icons/react";

const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  // ... more data points
];

const InteractiveBarChart = ({ moduleColor }) => {
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
            <IconAvatar icon={ChartBarIcon} variant={moduleColor} size="md" decorative />
            <div>
              <CardTitle>Bar Chart - Interactive</CardTitle>
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
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
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
            <Bar dataKey={activeChart} fill="var(--color-desktop)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const customLabelBarCode = `// Bar chart with custom formatted labels and positioning`

export const mixedBarCode = `// Mixed chart combining bars and lines for different data types`

export const activeBarCode = `// Bar chart with hover effects and interactive highlighting`
