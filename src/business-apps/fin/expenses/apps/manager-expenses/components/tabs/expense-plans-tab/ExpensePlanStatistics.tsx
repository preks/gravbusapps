import React from 'react';
import { CalendarOutlined, FileOutlined, DollarOutlined } from '@ant-design/icons';
import { ExpensePlanStatistics } from '../../../hooks/useGetExpensePlans'; // Assuming this type is exported from your hook
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface ExpensePlanStatisticsProps {
  planStats: ExpensePlanStatistics | null;
  statsLoading: boolean;
  statsError: Error | null;
  fetchPlanStatistics: () => void;
}

const ExpensePlanStatisticsDisplay: React.FC<ExpensePlanStatisticsProps> = ({
  planStats,
  statsLoading,
  statsError,
  fetchPlanStatistics,
}) => {
  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = planStats ? [
    {
      key: 'pending-approval',
      title: 'Pending Approval',
      value: planStats.pendingCount,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 6 },
      description: 'Requires action'
    },
    {
      key: 'pending-amount',
      title: 'Pending Amount',
      value: planStats.pendingAmount ?? 0,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#faad14',
      precision: 2,
      span: { xs: 24, sm: 6 },
      description: 'Awaiting approval'
    },
    {
      key: 'total-plans',
      title: 'Total Plans (Submitted)',
      value: planStats.totalCount,
      prefix: <FileOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 6 },
      description: 'All submitted plans'
    },
    {
      key: 'total-amount',
      title: 'Total Amount (Submitted)',
      value: planStats.sumTotalAmount,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 6 },
      description: 'Across all plans'
    }
  ] : [];

  return (
      <WidgetGroup
        widgets={widgets}
        isLoading={statsLoading}
        error={statsError}
        onRetry={fetchPlanStatistics}
        skeletonCount={3}
        emptyText="No expense plan statistics available."
        cardBackground="transparent"
      />
  );

};

export default ExpensePlanStatisticsDisplay;
