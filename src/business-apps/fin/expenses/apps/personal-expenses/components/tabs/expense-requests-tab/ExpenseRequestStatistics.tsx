import React, { useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  CalendarOutlined 
} from '@ant-design/icons';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { useGetExpenseRequestStatistics } from '../../../hooks/useGetExpenseRequestStatistics';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface ExpenseRequestStatisticsProps extends BusinessAppContextProps {
  statsLoading?: boolean;
  statsError?: string | null;
  fetchRequestStatistics?: () => Promise<void>;
  onWidgetClick?: (widgetKey: string) => void;
  activeWidgetKey?: string;
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({ 
  statsLoading = false,
  statsError = null,
  fetchRequestStatistics = () => Promise.resolve(),
  onWidgetClick,
  activeWidgetKey,
  ...contextProps
}) => {
  // Memoize context props to ensure stable reference
  const stableContextProps = useMemo(() => ({
    accessToken: contextProps.accessToken,
    userInfo: contextProps.userInfo
  }), [contextProps.accessToken, contextProps.userInfo]);

  // Use the statistics hook
  const { statistics, isLoading: hookLoading, error: hookError, fetchStatistics } = useGetExpenseRequestStatistics(stableContextProps);
  
  // Combine loading states
  const isLoading = statsLoading || hookLoading;
  const error = statsError || hookError;
  
  // Ensure statistics are fetched when component mounts
  React.useEffect(() => {
    if (stableContextProps.accessToken && stableContextProps.userInfo?.employeeDetails?.employeeId) {
      fetchStatistics();
    }
  }, [stableContextProps.accessToken, stableContextProps.userInfo?.employeeDetails?.employeeId, fetchStatistics]);
  
  // Calculate current month name
  const currentMonthName = dayjs().format('MMMM');
  
  // Calculate percentage changes for trend data
  const totalRequestsPercentageChange = useMemo(() => {
    if (statistics.previousMonthTotal === 0) {
      return statistics.currentMonthTotal > 0 ? 100 : 0;
    }
    return ((statistics.currentMonthTotal - statistics.previousMonthTotal) / statistics.previousMonthTotal) * 100;
  }, [statistics.currentMonthTotal, statistics.previousMonthTotal]);

  const totalAmountPercentageChange = useMemo(() => {
    if (statistics.previousMonthAmount === 0) {
      return statistics.currentMonthAmount > 0 ? 100 : 0;
    }
    return ((statistics.currentMonthAmount - statistics.previousMonthAmount) / statistics.previousMonthAmount) * 100;
  }, [statistics.currentMonthAmount, statistics.previousMonthAmount]);

  // Calculate trend data
  const totalRequestsTrend = useMemo(() => {
    if (statistics.previousMonthTotal === 0 && statistics.currentMonthTotal > 0) {
      return {
        value: '+100%',
        positive: true,
        description: 'from last month'
      };
    }
    if (totalRequestsPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: 'from last month'
      };
    }
    const sign = totalRequestsPercentageChange > 0 ? '+' : '';
    return {
      value: `${sign}${totalRequestsPercentageChange.toFixed(0)}%`,
      positive: totalRequestsPercentageChange >= 0,
      description: 'from last month'
    };
  }, [totalRequestsPercentageChange, statistics.currentMonthTotal, statistics.previousMonthTotal]);

  const totalAmountTrend = useMemo(() => {
    if (statistics.previousMonthAmount === 0 && statistics.currentMonthAmount > 0) {
      return {
        value: '+100%',
        positive: true,
        description: 'from last month'
      };
    }
    if (totalAmountPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: 'from last month'
      };
    }
    const sign = totalAmountPercentageChange > 0 ? '+' : '';
    return {
      value: `${sign}${totalAmountPercentageChange.toFixed(0)}%`,
      positive: totalAmountPercentageChange >= 0,
      description: 'from last month'
    };
  }, [totalAmountPercentageChange, statistics.currentMonthAmount, statistics.previousMonthAmount]);

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback((widgetKey: string) => {
    // Prevent clicking when statistics are still loading
    if (isLoading) {
      return;
    }
    
    // Provide immediate visual feedback - let parent component handle all filtering
    if (onWidgetClick) {
      onWidgetClick(widgetKey);
    }
  }, [onWidgetClick, isLoading]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-requests',
      title: `Total Requests for ${currentMonthName}`,
      value: statistics.currentMonthTotal,
      prefix: <FileTextOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Submitted expense requests',
      trend: totalRequestsTrend,
      active: activeWidgetKey === 'total-requests'
    },
    {
      key: 'total-amount',
      title: `Total Amount for ${currentMonthName}`,
      value: statistics.currentMonthAmount,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Across all requests',
      trend: totalAmountTrend,
      active: activeWidgetKey === 'total-amount'
    },
    {
      key: 'pending-approval',
      title: 'Pending Approval',
      value: statistics.pendingApproval,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Requires action',
      active: activeWidgetKey === 'pending-approval'
    },
    {
      key: 'reimbursable',
      title: 'Reimbursable',
      value: statistics.reimbursableAmount,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#722ed1',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'To be reimbursed',
      active: activeWidgetKey === 'reimbursable'
    }
  ];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      emptyText="No expense request statistics available."
      data-testid="expense-request-statistics"
      onWidgetClick={handleWidgetClick}
    />
  );
};

export default ExpenseRequestStatistics;