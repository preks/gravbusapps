export const simpleLineCode = `// Simple line chart implementation`
export const multipleLineCode = `// Multiple series line chart implementation`
export const lineDotsCode = `// Line chart with dots implementation`
export const stepLineCode = `// Step line chart implementation`
export const linearLineCode = `// Linear line chart implementation`

export const interactiveLineCode = `import React, { useMemo, useState } from "react";
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
import { LineChart, Line, XAxis, CartesianGrid } from "recharts";
import { ChartLineIcon } from "@phosphor-icons/react";

const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  // ... more data points
];

const InteractiveLineChart = ({ moduleColor }) => {
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
            <IconAvatar icon={ChartLineIcon} variant={moduleColor} size="md" decorative />
            <div>
              <CardTitle>Line Chart - Interactive</CardTitle>
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
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
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
            <Line
              type="monotone"
              dataKey={activeChart}
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};`

export const customDotsLineCode = `// Line chart with custom styled data points and active states`

export const dotsColorsLineCode = `// Line chart with colored dots and active state styling`

export const lineLabelCode = `// Line chart with data labels displayed above points`

export const customLabelLineCode = `// Line chart with custom formatted labels and positioning`
