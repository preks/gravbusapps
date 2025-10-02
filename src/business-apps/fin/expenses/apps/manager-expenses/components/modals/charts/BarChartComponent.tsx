import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
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
  barColor = "#8884d8",
  height = 300,
  currency = "EUR",
  valueType = 'amount',
  countLabel = 'items',
  getColor,
}) => {
  const resolveCssVar = (color: string): string => {
    if (typeof globalThis === 'undefined') return color;
    if (!color?.startsWith('var(')) return color;
    const varName = color.substring(4, color.length - 1).trim();
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || color;
  };

  const resolvedBarColor = React.useMemo(() => resolveCssVar(barColor), [barColor]);
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
            <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel("lowcoder:charts.empty.title","No data available")}
            </div>
            <div className="gba:text-gray-400 gba:text-sm">
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
        <div
          style={{ height: height }}
          data-testid={`${title.toLowerCase().replace(/\s+/g, "-")}-chart`}
        >
          <ResponsiveContainer width="100%" height="100%">
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
              <Tooltip
                formatter={(value: any, _name: any, props: any) => {
                  if (valueType === 'count') {
                    const num = typeof value === 'number' ? value : Number(value ?? 0);
                    return [`${num} ${countLabel}`,''];
                  }
                  const count = props?.payload?.count ?? null;
                  const amountText = formatCurrencyDisplay(value, currency);
                  return [count !== null ? `${amountText} (Count: ${count})` : amountText, ''];
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey={barDataKey} fill={resolvedBarColor}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={(() => {
                    const candidate = getColor ? (getColor(entry, index) || resolvedBarColor) : resolvedBarColor;
                    return resolveCssVar(candidate);
                  })()} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarChartComponent;
