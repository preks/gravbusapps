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
import { PieChart, Pie, Cell, Legend } from "recharts";
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

  // Create chart config dynamically from data
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [dataKey]: {
        label: valueType === 'count' ? countLabel : getTranslationFromI18nKeyAndLabel("lowcoder:charts.tooltip.amount", "Amount"),
      },
    };
    
    // Add each data item to config
    data.forEach((item, index) => {
      const key = item.name.toLowerCase().replace(/\s+/g, '_');
      config[key] = {
        label: item.name,
      };
    });
    
    return config;
  }, [data, dataKey, valueType, countLabel]);
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
          className="gba:mx-auto"
          style={{ minHeight: height, width: '100%' }}
          data-testid={`${title.toLowerCase().replace(/\s+/g, "-")}-chart`}
        >
          <PieChart width={500} height={400}>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value: any, _name: any, props: any) => {
                    const num = Number(value ?? 0);
                    if (valueType === "count") {
                      const itemsLabel = getTranslationFromI18nKeyAndLabel(
                        "lowcoder:charts.tooltip.items",
                        countLabel,
                      );
                      return `${num} ${itemsLabel}`;
                    }
                    const fixed = Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
                    const count = props?.payload?.count ?? null;
                    const amountText = formatCurrencyDisplay(fixed, currency);
                    const countLabelText = getTranslationFromI18nKeyAndLabel("lowcoder:charts.tooltip.count","Count");
                    return count === null ? amountText : `${amountText} (${countLabelText}: ${count})`;
                  }}
                  nameKey="name"
                />
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              labelLine={true}
              label={({ cx, cy, midAngle, outerRadius, fill, ...entry }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 30;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                
                let text;
                if (valueType === "count") {
                  text = entry[dataKey];
                } else {
                  const value = Number(entry[dataKey] ?? 0);
                  const fixed = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
                  text = formatCurrencyDisplay(fixed, currency);
                }
                
                return (
                  <text 
                    x={x} 
                    y={y} 
                    fill="#000000"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight={500}
                  >
                    {text}
                  </text>
                );
              }}
              outerRadius={100}
              innerRadius={60}
              fill="var(--nw-chart-1)"
              dataKey={dataKey}
              nameKey="name"
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
            <Legend 
              layout="horizontal" 
              align="center"
              verticalAlign="bottom"
              iconSize={10}
              wrapperStyle={{ 
                paddingTop: '20px',
                display: 'flex',
                flexWrap: 'nowrap',
                justifyContent: 'center',
                gap: '16px'
              }}
              formatter={(value) => (
                <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{value}</span>
              )}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PieChartComponent;
