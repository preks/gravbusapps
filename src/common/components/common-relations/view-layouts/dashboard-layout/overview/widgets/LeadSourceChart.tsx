import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
} from "@newwork/nw-design-system";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@newwork/nw-design-system";
import { PieChart, Pie } from "recharts";
import { ChartPieIcon } from "@phosphor-icons/react";

export interface LeadSourceItem {
  source: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface LeadSourceChartProps {
  items: LeadSourceItem[];
  totalLeads: number;
  moduleColor?: string;
}

const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const LeadSourceChart: React.FC<LeadSourceChartProps> = ({
  items,
  totalLeads,
  moduleColor,
}) => {
  const dataKey = "leads";
  const nameKey = "source";

  const chartData = useMemo(() => {
    return items.map((item) => {
      const key = toKey(item.source);
      return {
        [nameKey]: key,
        [dataKey]: item.value,
        fill: `var(--color-${key})`,
      } as Record<string, string | number>;
    });
  }, [items]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string }> = {
      [dataKey]: {},
    };
    items.forEach((item) => {
      const key = toKey(item.source);
      config[key] = { label: item.source };
    });
    return config as ChartConfig;
  }, [items]);
  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar
          icon={ChartPieIcon}
          variant={moduleColor as any}
          size="md"
          iconWeight="regular"
          decorative={true}
        />
        <div>
          <CardTitle>Lead Sources - Open Leads</CardTitle>
          <CardDescription>Distribution by source</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <div className="gba:space-y-4">
            {/* Chart with center content */}
            <div className="gba:relative gba:w-full gba:flex gba:justify-center">
              <ChartContainer config={chartConfig} className="gba:w-full gba:h-[300px]">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    dataKey={dataKey}
                    nameKey={nameKey}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />}
                  />
                  <ChartLegend content={<ChartLegendContent />}     className="gba:-translate-y-2 gba:flex-wrap gba:gap-2 gba:*:basis-1/4 gba:*:justify-center" />
                </PieChart>
              </ChartContainer>

              {/* Center content overlay */}
              <div
                className="gba:absolute gba:pointer-events-none"
                style={{
                  transform: "translate(-50%, -50%)",
                  left: "50%",
                  top: "50%",
                }}
              >
                <div className="gba:text-center">
                  <div className="gba:text-base gba:font-semibold gba:text-gray-700">
                    Total Leads
                  </div>
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {formatLargeNumber(totalLeads)}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend handled by ChartContainer config via tooltip/legend components if needed */}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8">
            <div className="gba:text-gray-500">No revenue data available</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadSourceChart;
