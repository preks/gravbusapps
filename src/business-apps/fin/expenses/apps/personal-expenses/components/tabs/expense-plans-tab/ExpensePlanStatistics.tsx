import { formatNumberFunction } from '@/common/utils/windowUtils';
import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  CalendarOutlined, 
  CompassOutlined 
} from '@ant-design/icons';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface ExpensePlanStatisticsProps {
  plans: any[];
  currentMonthTotal: number;
  previousMonthTotal: number;
  totalEstimated: number;
  pendingApproval: number;
  topDestination: string;
  statsLoading?: boolean;
  statsError?: Error | null;
  fetchPlanStatistics?: () => void;
}

const ExpensePlanStatistics: React.FC<ExpensePlanStatisticsProps> = ({ 
  currentMonthTotal,
  previousMonthTotal,
  totalEstimated,
  pendingApproval,
  topDestination,
  statsLoading = false,
  statsError = null,
  fetchPlanStatistics = () => {}
}) => {
  // Calculate summary statistics with memoization
  const currentMonthName = dayjs().format('MMMM');

  const totalPlans = useMemo(() => currentMonthTotal, [currentMonthTotal]);

  const percentageChange = useMemo(() => {
    if (previousMonthTotal === 0) {
      return currentMonthTotal > 0 ? 100 : 0;
    }
    return ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
  }, [currentMonthTotal, previousMonthTotal]);

  const description = useMemo(() => {
    if (previousMonthTotal === 0 && currentMonthTotal > 0) {
      return 'New activity this month';
    }
    if (percentageChange === 0) {
      return 'No change from last month';
    }
    const sign = percentageChange > 0 ? '+' : '';
    return `${sign}${percentageChange.toFixed(0)}% from last month`;
  }, [percentageChange, currentMonthTotal, previousMonthTotal]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-plans',
      title: `Total Plans for ${currentMonthName}`,
      value: totalPlans,
      prefix: <FileTextOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: description
    },
    {
      key: 'total-estimated',
      title: `Total Estimated for ${currentMonthName}`,
      value: `${formatNumberFunction(String(totalEstimated ?? '0'))} €`,
      prefix: <DollarOutlined />,
      color: '#3f8600',
      span: { xs: 24, sm: 12, md: 6 },
    },
    {
      key: 'pending-approval',
      title: 'Pending Approval',
      value: pendingApproval,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Requires action'
    },
    {
      key: 'top-destinations',
      title: 'Top Destination',
      value: topDestination,
      prefix: <CompassOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Most frequent'
    }
  ];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchPlanStatistics}
      skeletonCount={4}
      emptyText="No expense plan statistics available."
      data-testid="expense-plan-statistics"
    />
  );
};

export default ExpensePlanStatistics;