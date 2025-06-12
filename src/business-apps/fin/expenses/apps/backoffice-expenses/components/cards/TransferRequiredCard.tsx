import React from 'react';
import { Card, Statistic, Spin, Alert } from 'antd';

export interface TransferRequiredCardProps {
  loading: boolean;
  error: Error | null;
  transferRequired: number;
}

const TransferRequiredCard: React.FC<TransferRequiredCardProps> = ({ loading, error, transferRequired }) => {
  if (error) {
    return (
      <Card title="Transfer Required" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  return (
    <Card title="Transfer Required" className="gba:bg-orange-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Statistic
            value={transferRequired}
            precision={2}
            suffix="USD"
            valueStyle={{ color: '#d46b08' }}
          />
          <div className="gba:mt-2 gba:text-sm gba:text-gray-600">
            Approved expenses awaiting payment
          </div>
        </>
      )}
    </Card>
  );
};

export default TransferRequiredCard;
