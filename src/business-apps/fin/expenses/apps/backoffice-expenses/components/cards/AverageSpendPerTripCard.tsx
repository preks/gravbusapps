import React from 'react';
import { Card, Statistic, Spin, Alert } from 'antd';

export interface AverageSpendPerTripCardProps {
  loading: boolean;
  error: Error | null;
  avgSpendPerTrip: number;
  travelExpensesCount: number;
}

const AverageSpendPerTripCard: React.FC<AverageSpendPerTripCardProps> = ({ loading, error, avgSpendPerTrip, travelExpensesCount }) => {
  if (error) {
    return (
      <Card title="Average Spend per Trip" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  return (
    <Card title="Average Spend per Trip" className="gba:bg-blue-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Statistic
            value={avgSpendPerTrip}
            precision={2}
            suffix="USD"
            valueStyle={{ color: '#1890ff' }}
          />
          <div className="gba:mt-2 gba:text-sm gba:text-gray-600">
            Based on {travelExpensesCount} travel expenses
          </div>
        </>
      )}
    </Card>
  );
};

export default AverageSpendPerTripCard;
