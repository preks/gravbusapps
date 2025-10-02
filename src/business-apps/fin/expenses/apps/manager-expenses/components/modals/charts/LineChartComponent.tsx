import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";

interface LineChartProps {
  data: {
    date: string;
    value: number;
  }[];
  title: string;
  xAxisDataKey?: string;
  lineDataKey?: string;
  lineColor?: string;
  height?: number;
  currency?: string;
}

/**
 * Reusable line chart component for time series analytics
 */
const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  title,
  xAxisDataKey = "date",
  lineDataKey = "value",
  lineColor = "#82ca9d",
  height = 300,
  currency = "EUR",
}) => {
  const resolveCssVar = (color: string): string => {
    if (typeof globalThis === 'undefined') return color;
    if (!color?.startsWith('var(')) return color;
    const varName = color.substring(4, color.length - 1).trim();
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || color;
  };

  const resolvedLineColor = React.useMemo(() => resolveCssVar(lineColor), [lineColor]);
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
            <LineChart
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
                formatter={(value) => {
                  const num = typeof value === 'number' ? value : Number(value ?? 0);
                  const fixed = Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
                  return [formatCurrencyDisplay(fixed, currency), "Amount"];
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={lineDataKey}
                stroke={resolvedLineColor}
                activeDot={{ r: 8 }}
                name="Amount"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default LineChartComponent;
