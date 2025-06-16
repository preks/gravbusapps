/**
 * Actual vs Planned Expense Card Component
 * Displays full year expense plan and request totals in EUR with comparison
 */

import React from 'react';
import { Card, Statistic, Spin, Typography, Tooltip, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { ExpensePlanYearly, YTDStats } from '../../types';

const { Text } = Typography;

export interface ActualVsPlannedCardProps {
  loading: boolean;
  error: Error | null;
  ytdStats: YTDStats;
  expensePlanYearly: ExpensePlanYearly;
}

const ActualVsPlannedCard: React.FC<ActualVsPlannedCardProps> = ({ loading, error, ytdStats, expensePlanYearly }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const currentYear = new Date().getFullYear();

  const calculateDifference = () => {
    const actualAmount = ytdStats.totalAmount;
    const plannedAmount = expensePlanYearly.totalAmount;
    const difference = actualAmount - plannedAmount;

    let percentDifference = 0;
    if (plannedAmount > 0) {
      percentDifference = (difference / plannedAmount) * 100;
    } else if (actualAmount > 0) {
      percentDifference = 100;
    }

    return { difference, percentDifference, isOverBudget: difference > 0 };
  };

  if (error) {
    return (
      <Card title="Actual vs Planned" className="gba:bg-blue-50" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  const { difference, percentDifference, isOverBudget } = calculateDifference();
  const actualAmount = Number(ytdStats.totalAmount) || 0;
  const plannedAmount = Number(expensePlanYearly.totalAmount) || 0;
  let progressPercent = 0;
  if (plannedAmount > 0) {
    progressPercent = Math.min(Math.round((actualAmount / plannedAmount) * 100), 100);
  }

  return (
    <Card title={`Actual vs Planned ${currentYear}`} className="gba:bg-blue-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Statistic
            title="Budget Utilization"
            value={percentDifference}
            precision={2}
            valueStyle={{ color: isOverBudget ? '#cf1322' : '#3f8600' }}
            prefix={isOverBudget ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            suffix="%"
          />

          <div className="gba:mt-2">
            <Text strong>Planned: </Text>
            <Text>
              {formatCurrency(expensePlanYearly.totalAmount)} ({expensePlanYearly.count} plans)
            </Text>
          </div>

          <div className="gba:mt-1">
            <Text strong>Actual: </Text>
            <Text>
              {formatCurrency(ytdStats.totalAmount)} ({ytdStats.count} expenses)
            </Text>
          </div>

          <div className="gba:mt-2">
            <Tooltip title={`${progressPercent}% of planned budget spent`}>
              <div style={{ position: 'relative', height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    height: '100%',
                    backgroundColor: isOverBudget ? '#ff4d4f' : '#52c41a',
                    width: `${Math.max(0.5, progressPercent)}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                {progressPercent}%
              </div>
            </Tooltip>
          </div>

          <div className="gba:mt-2 gba:text-xs gba:text-gray-500">
            {isOverBudget
              ? `Over budget by ${formatCurrency(Math.abs(difference))} (${Math.abs(percentDifference).toFixed(1)}%)`
              : `Under budget by ${formatCurrency(Math.abs(difference))} (${Math.abs(percentDifference).toFixed(1)}%)`}
          </div>
        </>
      )}
    </Card>
  );
};

export default ActualVsPlannedCard;
