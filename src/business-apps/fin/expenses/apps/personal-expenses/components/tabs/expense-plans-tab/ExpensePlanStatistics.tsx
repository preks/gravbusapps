import { formatNumberFunction } from '@/common/utils/windowUtils';
import React, { useMemo, useCallback } from 'react';
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
  onWidgetClick?: (widgetKey: string) => void;
  activeWidgetKey?: string;
  // Add closed plans data
  currentMonthClosedPlans?: number;
  previousMonthClosedPlans?: number;
}

const ExpensePlanStatistics: React.FC<ExpensePlanStatisticsProps> = ({ 
  currentMonthTotal,
  previousMonthTotal,
  totalEstimated,
  pendingApproval,
  topDestination,
  statsLoading = false,
  statsError = null,
  fetchPlanStatistics = () => {},
  onWidgetClick,
  activeWidgetKey,
  currentMonthClosedPlans = 0,
  previousMonthClosedPlans = 0
}) => {
  // Calculate summary statistics with memoization
  const currentMonthName = dayjs().format('MMMM');

  // Use closed plans data for total plans widget
  const totalPlans = useMemo(() => currentMonthClosedPlans, [currentMonthClosedPlans]);
  

  const percentageChange = useMemo(() => {
    if (previousMonthClosedPlans === 0) {
      return currentMonthClosedPlans > 0 ? 100 : 0;
    }
    return ((currentMonthClosedPlans - previousMonthClosedPlans) / previousMonthClosedPlans) * 100;
  }, [currentMonthClosedPlans, previousMonthClosedPlans]);

  const description = useMemo(() => {
    if (previousMonthClosedPlans === 0 && currentMonthClosedPlans > 0) {
      return 'New closed plans this month';
    }
    if (percentageChange === 0) {
      return 'No change from last month';
    }
    const sign = percentageChange > 0 ? '+' : '';
    return `${sign}${percentageChange.toFixed(0)}% from last month`;
  }, [percentageChange, currentMonthClosedPlans, previousMonthClosedPlans]);

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback((widgetKey: string) => {
  
    // Prevent clicking when statistics are still loading
    if (statsLoading) {
      return;
    }
    
    // Provide immediate visual feedback - let parent component handle all filtering
    if (onWidgetClick) {
      onWidgetClick(widgetKey);
    }
  }, [onWidgetClick, statsLoading]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(() => [
    {
      key: 'total-plans',
      title: `Total Plans for ${currentMonthName}`,
      value: totalPlans,
      prefix: <FileTextOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: description,
      active: activeWidgetKey === 'total-plans',
      onClick: () => handleWidgetClick('total-plans')
    },
    {
      key: 'total-estimated',
      title: `Total Estimated for ${currentMonthName}`,
      value: `${formatNumberFunction(String(totalEstimated ?? '0'))} €`,
      prefix: <DollarOutlined />,
      color: '#3f8600',
      span: { xs: 24, sm: 12, md: 6 },
      active: activeWidgetKey === 'total-estimated',
      onClick: () => handleWidgetClick('total-estimated')
    },
    {
      key: 'pending-approval',
      title: 'Pending Approval',
      value: pendingApproval,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Requires action',
      active: activeWidgetKey === 'pending-approval',
      onClick: () => handleWidgetClick('pending-approval')
    },
    {
      key: 'top-destinations',
      title: 'Top Destination',
      value: topDestination,
      prefix: <CompassOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 6 },
      description: topDestination && topDestination !== 'N/A' ? 'Most frequent' : 'No data available',
      active: activeWidgetKey === 'top-destinations',
      onClick: () => {
        handleWidgetClick('top-destinations');
      }
    }
  ], [currentMonthName, totalPlans, totalEstimated, pendingApproval, topDestination, description, activeWidgetKey, handleWidgetClick, statsLoading]);

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchPlanStatistics}
      onWidgetClick={onWidgetClick}
      skeletonCount={4}
      emptyText="No expense plan statistics available."
      data-testid="expense-plan-statistics"
    />
  );
};

export default ExpensePlanStatistics;