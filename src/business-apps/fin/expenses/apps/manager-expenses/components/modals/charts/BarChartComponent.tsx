import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@newwork/nw-design-system";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
}

/**
 * Reusable bar chart component for analytics
 */
const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title,
  xAxisDataKey = "name",
  barDataKey = "value",
  barColor = "#1890ff",
  height = 300,
  currency = "EUR",
}) => {
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
              No data available
            </div>
            <div className="gba:text-gray-400 gba:text-sm">
              There is no data to display for this chart.
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
                  const count = props?.payload?.count ?? null;
                  const amountText = formatCurrencyDisplay(value, currency);
                  return [
                    count !== null ? `${amountText} (Count: ${count})` : amountText,
                    "Amount",
                  ];
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey={barDataKey} fill={barColor} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarChartComponent;
