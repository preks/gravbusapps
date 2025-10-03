import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";

interface BarChartProps {
  data: {
    name: string;
    value: number;
  }[];
  title: string;
  xAxisDataKey?: string;
  barDataKey?: string;
  barColor?: string;
  height?: number;
  currency?: string;
  valueType?: 'amount' | 'count';
  countLabel?: string;
  getColor?: (entry: any, index: number) => string | undefined;
}

/**
 * Reusable bar chart component for analytics
 */
const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title,
  xAxisDataKey = "name",
  barDataKey = "value",
  barColor = "var(--nw-color-primary-500)",
  height = 300,
  currency = "EUR",
  valueType = 'amount',
  countLabel = 'items',
  getColor,
}) => {
  const resolveCssVar = (color: string): string => {
    if (!color?.startsWith('var(')) return color;
    if (
      typeof globalThis.window === 'undefined' ||
      typeof globalThis.document === 'undefined' ||
      typeof globalThis.window.getComputedStyle !== 'function'
    ) {
      return color;
    }
    const varName = color.substring(4, color.length - 1).trim();
    const value = globalThis.window.getComputedStyle(globalThis.document.documentElement).getPropertyValue(varName).trim();
    return value || color;
  };

  const resolvedBarColor = React.useMemo(() => resolveCssVar(barColor), [barColor]);
  
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [barDataKey]: {
        label: valueType === 'count' ? countLabel : getTranslationFromI18nKeyAndLabel("lowcoder:charts.tooltip.amount", "Amount"),
      },
    };
    return config;
  }, [barDataKey, valueType, countLabel]);

  if (!data || data.length === 0) {
    return (
      <Card className="gba:w-full">
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center gba:min-h-[200px]">
            <div className="gba:text-muted-foreground gba:text-lg gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel("lowcoder:charts.empty.title","No data available")}
            </div>
            <div className="gba:text-muted-foreground gba:text-sm">
              {getTranslationFromI18nKeyAndLabel("lowcoder:charts.empty.description","There is no data to display for this chart.")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gba:w-full">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="gba:w-full"
          style={{ height: height }}
          data-testid={`${title.toLowerCase().replace(/\s+/g, "-")}-chart`}
        >
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value: any, _name: any, props: any) => {
                    if (valueType === 'count') {
                      const num = typeof value === 'number' ? value : Number(value ?? 0);
                      const itemsLabel = getTranslationFromI18nKeyAndLabel(
                        "lowcoder:charts.tooltip.items",
                        countLabel,
                      );
                      return `${num} ${itemsLabel}`;
                    }
                    const count = props?.payload?.count ?? null;
                    const amountText = formatCurrencyDisplay(value, currency);
                    const countLabelText = getTranslationFromI18nKeyAndLabel(
                      "lowcoder:charts.tooltip.count",
                      "Count",
                    );
                    return count === null ? amountText : `${amountText} (${countLabelText}: ${count})`;
                  }}
                />
              }
            />
            <Bar dataKey={barDataKey} fill={resolvedBarColor}>
              {data.map((entry, index) => {
                // Use entry name or value as key fallback to ensure uniqueness
                const entryKey = entry[xAxisDataKey] || entry[barDataKey] || index;
                return (
                  <Cell key={`cell-${entryKey}`} fill={(() => {
                    const candidate = getColor ? (getColor(entry, index) || resolvedBarColor) : resolvedBarColor;
                    return resolveCssVar(candidate);
                  })()} />
                );
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default BarChartComponent;
