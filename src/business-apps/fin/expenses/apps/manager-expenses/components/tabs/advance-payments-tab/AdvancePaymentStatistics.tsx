import React from 'react';
import { DollarCircleOutlined } from '@ant-design/icons';
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { formatAmount } from '../../../utils/currencyUtils';

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null;
  statsLoading: boolean;
  statsError: Error | null;
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
      key: 'total-count',
      title: 'Total Advance Payments',
      value: formatAmount(advancePaymentStats.totalCount || 0),
      prefix: <DollarCircleOutlined />,
      color: '#3f8600',
      valueIsString: true, // Mark as pre-formatted string
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
