import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCurrencyStore } from '../../../../store/useCurrencyStore';

interface ExpenseTrendsChartProps {
  data: {
    month: string;
    amount: number;
  }[];
  title?: string;
  currencyFilter?: string;
}

/**
 * Component to display monthly expense trends as a bar chart
 */
const ExpenseTrendsChart: React.FC<ExpenseTrendsChartProps> = ({ 
  data, 
  title = getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends', 'Monthly Expense Trends'),
  currencyFilter
}) => {
  // Use the global currency store
  const { primaryCurrency } = useCurrencyStore();
  
  // Use the selected currency filter or fall back to primary currency
  const displayCurrency = currencyFilter || primaryCurrency;
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:py-8 gba:text-center">
            <p className="gba:text-muted-foreground">No expense trend data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:h-64" data-testid="expense-trends-chart">
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
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${displayCurrency} ${formatNumberFunction(value.toString(), "0[,]0")}`} data-testid="expense-trends-chart-y-axis" />
              <Tooltip 
                formatter={(value: number) => [`${displayCurrency} ${formatNumberFunction(value.toString(), "0.00[,]00")}`, 'Amount']}
                labelStyle={{ color: '#666' }}
                data-testid="expense-trends-chart-tooltip"
              />
              <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseTrendsChart;
