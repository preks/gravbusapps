import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@newwork/nw-design-system";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";

interface PieChartProps {
  data: {
    name: string;
    value: number;
  }[];
  title: string;
  nameKey?: string;
  dataKey?: string;
  height?: number;
  colors?: string[];
  currency?: string;
  valueType?: 'amount' | 'count';
  countLabel?: string;
  getColor?: (entry: any, index: number) => string | undefined;
}

/**
 * Reusable pie chart component for analytics
 */
const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  title,
  nameKey = "name",
  dataKey = "value",
  height = 300,
  colors = ["#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2", "#fa8c16"],
  currency = "EUR",
  valueType = 'amount',
  countLabel = 'items',
  getColor,
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
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor ? (getColor(entry, index) || colors[index % colors.length]) : colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, _name: any, props: any) => {
                  if (valueType === 'count') {
                    const num = typeof value === 'number' ? value : Number(value ?? 0);
                    return [`${num} ${countLabel}`, 'Count'];
                  }
                  const num = typeof value === 'number' ? value : Number(value ?? 0);
                  const fixed = Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
                  const count = props?.payload?.count ?? null;
                  const amountText = formatCurrencyDisplay(fixed, currency);
                  return [count !== null ? `${amountText} (Count: ${count})` : amountText, 'Amount'];
                }}
                labelFormatter={(name) => `${name}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PieChartComponent;
