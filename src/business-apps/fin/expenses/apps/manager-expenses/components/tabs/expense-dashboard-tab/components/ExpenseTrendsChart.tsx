import React from 'react';
import { Card, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ExpenseTrendsChartProps {
  data: {
    month: string;
    amount: number;
  }[];
  title?: string;
}

/**
 * Component to display monthly expense trends as a bar chart
 */
const ExpenseTrendsChart: React.FC<ExpenseTrendsChartProps> = ({ data, title = getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends', 'Monthly Expense Trends') }) => {
  if (!data || data.length === 0) {
    return (
      <Card title={title} className="gba:h-full">
        <Empty description="No expense trend data available" />
      </Card>
    );
  }

  return (
    <Card title={title} className="gba:h-full">
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
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value}€`, 'Amount']}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Bar dataKey="amount" fill="#1890ff" name="Amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ExpenseTrendsChart;
