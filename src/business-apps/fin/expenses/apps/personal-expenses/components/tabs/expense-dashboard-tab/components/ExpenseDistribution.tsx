import React from 'react';
import { Card, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { DashboardStats } from '../types';

interface ExpenseDistributionProps {
  stats: DashboardStats | undefined;
  chartView: string | number;
}

const generateColors = (numColors: number) => {
  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const hue = (i * 360) / numColors;
    colors.push(`hsl(${hue}, 90%, 65%)`);
  }
  return colors;
};

export const ExpenseDistribution: React.FC<ExpenseDistributionProps> = ({ stats, chartView }) => {
  const getExpensesByType = () => {
    switch (chartView) {
      case 'Quarterly':
        return stats?.expensesByTypeQuarter || {};
      case 'Yearly':
        return stats?.expensesByTypeYear || {};
      case 'Monthly':
      default:
        return stats?.expensesByTypeMonth || {};
    }
  };

  const expensesByType = getExpensesByType();

  const data = Object.entries(expensesByType)
    .map(([type, amount]) => ({ type, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount);

  if (data.length === 0) {
    return (
      <Card title="Expense Distribution" data-testid="expense-distribution-card-empty">
        <Empty description="No expense data available" />
      </Card>
    );
  }

  const totalExpenses = data.reduce((sum, item) => sum + item.amount, 0);
  const COLORS = generateColors(data.length);

  return (
    <Card title="Expense Distribution" data-testid="expense-distribution-card">
      <div style={{ height: 300 }} data-testid="expense-distribution-chart-container">
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
              dataKey="amount"
              nameKey="type"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => {
                const percent = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(0) : 0;
                return [`${formatCurrency(value)} (${percent}%)`, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ExpenseDistribution;
