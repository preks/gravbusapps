import React from 'react';
import { ClockCircleOutlined, FileOutlined, DollarOutlined } from '@ant-design/icons';
import { ExpenseRequestStatisticsData } from '../../hooks/useGetExpenseRequests';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface ExpenseRequestStatisticsProps {
  requestStats: ExpenseRequestStatisticsData | null;
  requestStatsLoading: boolean;
  requestStatsError: string | null;
  fetchRequestStatistics: () => Promise<void>;
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  requestStats,
  requestStatsLoading,
  requestStatsError,
  fetchRequestStatistics,
}) => {
  // Calculate total requests count (pending + approved + rejected)
  const totalRequests = requestStats ? 
    requestStats.pendingCount + requestStats.approvedCount + requestStats.rejectedCount : 0;

  // Transform stat cards to widget items
  const widgets: WidgetItem[] = requestStats ? [
    {
      key: 'pending-requests',
      title: 'Pending Requests',
      value: requestStats.pendingCount,
      color: '#faad14',
      prefix: <ClockCircleOutlined />,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: 'Waiting for approval'
    },
    {
      key: 'pending-amount',
      title: 'Pending Amount',
      value: requestStats.pendingAmount,
      color: '#faad14',
      prefix: <DollarOutlined />,
      suffix: '€',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: 'Total pending funds'
    },
    {
      key: 'total-requests',
      title: 'Total Requests (Submitted)',
      value: totalRequests,
      color: '#1890ff',
      prefix: <FileOutlined />,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: 'All submitted requests'
    },
    {
      key: 'total-submitted-amount',
      title: 'Total Submitted Amount',
      value: requestStats.totalSubmittedAmount,
      color: '#3f8600',
      prefix: <DollarOutlined />,
      suffix: '€',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: 'All expense requests'
    }
  ] : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError}
      onRetry={fetchRequestStatistics}
      emptyText="No expense request statistics available."
      skeletonCount={4}
    />
  );
};

export default ExpenseRequestStatistics;
