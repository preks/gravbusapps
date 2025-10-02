import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@newwork/nw-design-system";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any; // Allow additional dynamic properties
  }>;
  title: string;
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
  dataKey = "value",
  height = 300,
  colors = [
    'var(--nw-color-primary-500)',
    'var(--nw-color-success-500)',
    'var(--nw-color-warning-500)',
    'var(--nw-color-danger-500)',
    'var(--nw-color-info-500)',
    'var(--nw-color-accent-500)',
    'var(--nw-color-neutral-500)'
  ],
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

  const resolvedColors = React.useMemo(() => colors.map(resolveCssVar), [colors]);
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
                {data.map((entry, index) => {
                  const base = resolvedColors[index % resolvedColors.length];
                  const custom = getColor ? getColor(entry, index) : undefined;
                  const resolved = custom ? resolveCssVar(custom) : base;
                  // Use entry name or value as key fallback to ensure uniqueness
                  const entryKey = entry.name || entry[dataKey] || index;
                  return <Cell key={`cell-${entryKey}`} fill={resolved} />;
                })}
              </Pie>
              <Tooltip
                formatter={(value: any, _name: any, props: any) => {
                  const num = Number(value ?? 0);
                  if (valueType === "count") {
                    const itemsLabel = getTranslationFromI18nKeyAndLabel(
                      "lowcoder:charts.tooltip.items",
                      countLabel,
                    );
                    const countLabelText = getTranslationFromI18nKeyAndLabel(
                      "lowcoder:charts.tooltip.count",
                      "Count",
                    );
                    return [`${num} ${itemsLabel}`, countLabelText];
                  }
                  const fixed = Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
                  const count = props?.payload?.count ?? null;
                  const amountText = formatCurrencyDisplay(fixed, currency);
                  const amountLabel = getTranslationFromI18nKeyAndLabel("lowcoder:charts.tooltip.amount","Amount");
                  const countLabelText = getTranslationFromI18nKeyAndLabel("lowcoder:charts.tooltip.count","Count");
                  return [count === null ? amountText : `${amountText} (${countLabelText}: ${count})`, amountLabel];
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
