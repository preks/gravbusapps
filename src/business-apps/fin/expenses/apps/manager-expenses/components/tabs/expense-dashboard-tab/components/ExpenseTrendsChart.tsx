import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@newwork/nw-design-system";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { formatCurrencyDisplay } from "../../../../../personal-expenses/utils";
import { useCurrencyStore } from "../../../../store/useCurrencyStore";
import { ChartBarIcon } from "@phosphor-icons/react";

interface ExpenseTrendsChartProps {
  data: {
    month: string;
    amount: number;
  }[];
  title?: string;
  currencyFilter?: string;
  moduleColor?: string;
}

/**
 * Component to display monthly expense trends as a bar chart
 */
const ExpenseTrendsChart: React.FC<ExpenseTrendsChartProps> = ({
  data,
  title = getTranslationFromI18nKeyAndLabel(
    "lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends",
    "Monthly Expense Trends",
  ),
  currencyFilter,
  moduleColor,
}) => {
  // Use the global currency store
  const { primaryCurrency } = useCurrencyStore();

  // Use the selected currency filter or fall back to primary currency
  const displayCurrency = currencyFilter || primaryCurrency;

  // Chart configuration for design system
  const chartConfig = useMemo(
    () => ({
      amount: {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:advance_payment_table.amount_label",
          "Amount",
        ),
      },
    }),
    [],
  );

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:p-8" data-testid="expense-trends-chart-empty-state">
            <ChartBarIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
              No data available
            </h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
              No expense trend data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ChartBarIcon} variant={moduleColor as any} size="md" decorative />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="gba:h-[320px] gba:w-full"
          data-testid="expense-trends-chart"
        >
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(value) => formatCurrencyDisplay(value, displayCurrency)}
              tick={{ fontSize: 12 }}
              data-testid="expense-trends-chart-y-axis"
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="amount"
              name="amount"
              stroke={`var(--color-amount)`}
              fill={`var(--color-amount)`}
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ExpenseTrendsChart;
