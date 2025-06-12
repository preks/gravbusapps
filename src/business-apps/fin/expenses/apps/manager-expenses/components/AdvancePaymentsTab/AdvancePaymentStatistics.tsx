import React from 'react';
import { DollarCircleOutlined } from '@ant-design/icons';
import { AdvancePaymentStatisticsData } from '../../hooks/useGetAdvancePayments'; // Adjusted path
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null;
  statsLoading: boolean;
  statsError: string | null;
  fetchAdvancePaymentStatistics: () => Promise<void>;
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  advancePaymentStats,
  statsLoading,
  statsError,
  fetchAdvancePaymentStatistics,
}) => {
  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = advancePaymentStats ? [
    {
      key: 'total-amount',
      title: 'Total Advance Payments Amount',
      value: advancePaymentStats.totalAmount,
      prefix: <DollarCircleOutlined />,
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 8, lg: 6 },
      description: 'All advance payments'
    }
  ] : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={1}
      emptyText="No advance payment statistics available."
    />
  );
};

export default AdvancePaymentStatistics;
