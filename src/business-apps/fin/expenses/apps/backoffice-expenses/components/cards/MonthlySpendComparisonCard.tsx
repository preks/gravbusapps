import React from 'react';
import { Card, Statistic, Spin, Typography, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { MonthlySpendComparison } from '../../types';

const { Text } = Typography;

export interface MonthlySpendComparisonCardProps {
  loading: boolean;
  error: Error | null;
  monthlySpendComparison: MonthlySpendComparison;
}

/**
 * Card component that displays the comparison between current month and previous month expense spend
 */
const MonthlySpendComparisonCard: React.FC<MonthlySpendComparisonCardProps> = ({ loading, error, monthlySpendComparison }) => {
  const {
    currentMonthTotal,
    previousMonthTotal,
    percentChange,
    isIncrease,
    currentMonthCount,
    previousMonthCount,
  } = monthlySpendComparison;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getCurrentMonthName = () => new Date().toLocaleString('default', { month: 'long' });

  const getPreviousMonthName = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  if (error) {
    return (
      <Card title="Monthly Spend Comparison" className="gba:bg-blue-50" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  return (
    <Card title="Monthly Spend Comparison" className="gba:bg-blue-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Statistic
            title={`${getCurrentMonthName()} vs ${getPreviousMonthName()}`}
            value={percentChange}
            precision={2}
            valueStyle={{ color: isIncrease ? '#cf1322' : '#3f8600' }}
            prefix={isIncrease ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            suffix="%"
          />

          <div className="gba:mt-2">
            <Text strong>{getCurrentMonthName()}: </Text>
            <Text>
              {formatCurrency(currentMonthTotal)} ({currentMonthCount} expenses)
            </Text>
          </div>

          <div className="gba:mt-1">
            <Text strong>{getPreviousMonthName()}: </Text>
            <Text>
              {formatCurrency(previousMonthTotal)} ({previousMonthCount} expenses)
            </Text>
          </div>

          <div className="gba:mt-2 gba:text-xs gba:text-gray-500">
            {isIncrease
              ? `Spending increased by ${formatCurrency(currentMonthTotal - previousMonthTotal)} compared to last month`
              : `Spending decreased by ${formatCurrency(previousMonthTotal - currentMonthTotal)} compared to last month`}
          </div>
        </>
      )}
    </Card>
  );
};

export default MonthlySpendComparisonCard;
