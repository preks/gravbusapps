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
  // Add date range filter callbacks
  onStartDateRangeFilterChange?: (startDateRange: [Date | null, Date | null] | null) => void;
  onEndDateRangeFilterChange?: (endDateRange: [Date | null, Date | null] | null) => void;
  onPlanDateRangeFilterChange?: (planDateRange: [Date | null, Date | null] | null) => void;
  // Add status filter callback
  onStatusFilterChange?: (status: string, selected: boolean) => void;
  // Add destination filter callback
  onDestinationFilterChange?: (destination: string | null) => void;
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
  previousMonthClosedPlans = 0,
  onStartDateRangeFilterChange,
  onEndDateRangeFilterChange,
  onPlanDateRangeFilterChange,
  onStatusFilterChange,
  onDestinationFilterChange
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
    
    // Provide immediate visual feedback
    if (onWidgetClick) {
      onWidgetClick(widgetKey);
    }
    
    // Set date range filters when total-plans widget is clicked
    if (widgetKey === 'total-plans') {
      const today = dayjs();
      const currentMonthStart = today.startOf('month').toDate();
      const currentMonthEnd = today.endOf('month').toDate();
      
      // Set plan date range to current month
      if (onPlanDateRangeFilterChange) {
        onPlanDateRangeFilterChange([currentMonthStart, currentMonthEnd]);
      }
    }
    
    // Set filters when total-estimated widget is clicked
    if (widgetKey === 'total-estimated') {
      const today = dayjs();
      const currentMonthStart = today.startOf('month').toDate();
      const currentMonthEnd = today.endOf('month').toDate();
      
      // Set plan date range to current month
      if (onPlanDateRangeFilterChange) {
        onPlanDateRangeFilterChange([currentMonthStart, currentMonthEnd]);
      }
      
      // Set status filters to exclude DRAFT (CREATED) and PAID
      if (onStatusFilterChange) {
        // First, clear any existing status filters
        // Then add all statuses except CREATED (Draft) and PAID
        const allStatuses = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          onStatusFilterChange(status, true);
        });
      }
    }
    
    // Set filters when pending-approval widget is clicked
    if (widgetKey === 'pending-approval') {
      // Clear any existing date range filters
      if (onStartDateRangeFilterChange) {
        onStartDateRangeFilterChange(null);
      }
      if (onEndDateRangeFilterChange) {
        onEndDateRangeFilterChange(null);
      }
      
      // Set status filter to only show PENDING plans
      if (onStatusFilterChange) {
        // Clear all existing status filters first
        const allStatuses = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'CLOSED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          onStatusFilterChange(status, false);
        });
        // Then add only PENDING status
        onStatusFilterChange('PENDING', true);
      }
    }
    
        // Set filters when top-destinations widget is clicked
    if (widgetKey === 'top-destinations') {
      // Check if topDestination is available
      if (!topDestination || topDestination === 'N/A') {
        return;
      }
      
      // Clear any existing date range filters
      if (onStartDateRangeFilterChange) {
        onStartDateRangeFilterChange(null);
      }
      if (onEndDateRangeFilterChange) {
        onEndDateRangeFilterChange(null);
      }
      
      // Clear all status filters to show all plans for the destination
      if (onStatusFilterChange) {
        const allStatuses = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'CLOSED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          onStatusFilterChange(status, false);
        });
      }
      
      // Apply destination filter to show plans for the top destination
      if (onDestinationFilterChange && topDestination && topDestination !== 'N/A') {
        onDestinationFilterChange(topDestination);
      } else if (onDestinationFilterChange) {
        onDestinationFilterChange(null);
      }
    }
  }, [onWidgetClick, onStartDateRangeFilterChange, onEndDateRangeFilterChange, onPlanDateRangeFilterChange, onStatusFilterChange, onDestinationFilterChange, topDestination, statsLoading]);

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
        console.log('Individual top-destinations widget onClick called');
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