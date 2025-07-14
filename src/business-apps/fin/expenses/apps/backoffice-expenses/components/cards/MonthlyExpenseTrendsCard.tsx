/**
 * Card component that displays a graph of monthly expense trends
 * Shows the total amount of paid expenses per month in EUR for the current year
 */

import React from 'react';
import { Card, Spin, Alert } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MonthlyExpenseTrend } from '../../types';

export interface MonthlyExpenseTrendsCardProps {
  loading: boolean;
  error: Error | null;
  monthlyTrends: MonthlyExpenseTrend[];
}

const MonthlyExpenseTrendsCard: React.FC<MonthlyExpenseTrendsCardProps> = ({ loading, error, monthlyTrends }) => {
  const currentYear = new Date().getFullYear();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (error) {
    return (
      <Card title={`Monthly Expense Trends ${currentYear}`} className="gba:bg-blue-50" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  // Custom tooltip formatter to match the original behavior
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="gba:bg-white gba:p-2 gba:border gba:rounded gba:shadow">
          <p className="gba:text-sm gba:font-medium">{`Month: ${label}`}</p>
          <p className="gba:text-sm" style={{ color: '#1890ff' }}>
            {`Total Expenses: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label component for bar tops
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill="#1890ff" 
        textAnchor="middle" 
        dy={-6}
        style={{ fontSize: '12px', opacity: 0.6 }}
      >
        {formatCurrency(value)}
      </text>
    );
  };

  return (
    <Card title={`Monthly Expense Trends ${currentYear}`} className="gba:bg-blue-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyTrends}
              margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey="monthName" 
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalAmount" 
                fill="#1890ff"
                label={renderCustomLabel}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default MonthlyExpenseTrendsCard;
