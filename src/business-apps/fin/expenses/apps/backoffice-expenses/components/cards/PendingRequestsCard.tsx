import React from 'react';
import { Card, Statistic, Spin, Alert } from 'antd';

export interface PendingRequestsCardProps {
  loading: boolean;
  error: Error | null;
  pendingRequestsCount: number;
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({ loading, error, pendingRequestsCount }) => {
  if (error) {
    return (
      <Card title="Pending Requests" style={{ height: '100%' }}>
        <Alert message={`Error: ${error.message}`} type="error" showIcon />
      </Card>
    );
  }

  return (
    <Card title="Pending Requests" className="gba:bg-cyan-50" style={{ height: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Statistic value={pendingRequestsCount} suffix="requests" />
      )}
    </Card>
  );
};

export default PendingRequestsCard;
