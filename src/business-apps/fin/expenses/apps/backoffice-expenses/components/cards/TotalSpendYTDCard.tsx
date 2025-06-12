import React from 'react';
import { Card, Statistic, Spin, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { YTDStats } from '../../types';

export interface TotalSpendYTDCardProps {
  loading: boolean;
  error: Error | null;
  ytdStats: YTDStats;
}

const TotalSpendYTDCard: React.FC<TotalSpendYTDCardProps> = ({ loading, error, ytdStats }) => {
  const { totalAmount, count, previousTotalAmount, previousCount } = ytdStats;

  const calculateYTDComparison = () => {
    let percentChange = 0;
    if (previousTotalAmount > 0) {
      percentChange = ((totalAmount - previousTotalAmount) / previousTotalAmount) * 100;
    } else if (totalAmount > 0) {
      percentChange = 100;
    }
    const isIncrease = totalAmount > previousTotalAmount;
    return { percentChange, isIncrease };
  };

  if (error) {
    return (
      <Card title="Total Company Spend YTD" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  const { percentChange, isIncrease } = calculateYTDComparison();

  return (
    <Card title="Total Company Spend YTD (EUR, Paid Status)" className="gba:bg-blue-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Statistic value={totalAmount} precision={2} suffix="EUR" />
          <div className={`gba:mt-2 gba:flex gba:items-center ${isIncrease ? 'gba:text-red-500' : 'gba:text-green-500'}`}>
            {isIncrease ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            <span className="gba:ml-1">{Math.abs(percentChange).toFixed(1)}% vs last year</span>
          </div>
          <div className="gba:mt-2 gba:text-xs gba:text-gray-500">
            Based on {count} expense requests this year vs {previousCount} last year
          </div>
        </>
      )}
    </Card>
  );
};

export default TotalSpendYTDCard;
