/**
 * Card component that displays a graph of monthly expense trends
 * Shows the total amount of paid expenses per month in EUR for the current year
 */

import React from 'react';
import { Card, Spin, Alert } from 'antd';
import { Column } from '@ant-design/plots';
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

  const config = {
    data: monthlyTrends,
    xField: 'monthName',
    yField: 'totalAmount',
    color: '#1890ff',
    label: {
      position: 'top' as const,
      style: {
        fill: '#1890ff',
        opacity: 0.6,
      },
      formatter: (datum: any) => formatCurrency(datum.totalAmount),
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      monthName: {
        alias: 'Month',
      },
      totalAmount: {
        alias: 'Total Expenses (EUR)',
        formatter: (value: number) => formatCurrency(value),
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: 'Total Expenses',
        value: formatCurrency(datum.totalAmount),
      }),
    },
  };

  return (
    <Card title={`Monthly Expense Trends ${currentYear}`} className="gba:bg-blue-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ height: 300 }}>
          <Column {...config} />
          <div className="gba:mt-2 gba:text-xs gba:text-gray-500">
            Showing paid expenses in EUR by month
          </div>
        </div>
      )}
    </Card>
  );
}

export default MonthlyExpenseTrendsCard;
