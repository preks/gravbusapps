import React, { useState, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useMainViewExpensePlans } from '../../../hooks/useMainViewExpensePlans';
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics';
import ExpensePlansTable from './ExpensePlansTable';

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
  employeeId?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const { accessToken, userInfo, onContentHeaderChange } = props;

  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);

  // Use the new main view hook for expense plans
  const {
    planStats,
    statsLoading,
    statsError,
    fetchPlanStatistics,
  } = useMainViewExpensePlans({
    accessToken,
    userInfo,
    pageSize: 1000, // Large page size for statistics
  });
  
  // Add debugging logs to track data flow
  React.useEffect(() => {
    console.log('ExpensePlansTab - planStats:', {
      totalCount: planStats?.totalCount,
      sumTotalAmount: planStats?.sumTotalAmount,
      pendingCount: planStats?.pendingCount,
      pendingAmount: planStats?.pendingAmount,
      timestamp: new Date().toISOString(),
      managerId: userInfo?.employeeDetails?.employeeId || 'not-available' // Use dynamic managerId from userInfo
    });
  }, [planStats, userInfo]);
  
  // Debug when component mounts to verify props
  React.useEffect(() => {
    console.log('ExpensePlansTab - Component mounted with props:', {
      hasAccessToken: !!accessToken,
      hasUserInfo: !!userInfo,
      employeeId: props.employeeId,
      hasContentHeaderChange: !!onContentHeaderChange
    });
  }, []);





  // Update the content header when statistics change
  useEffect(() => {
    if (onContentHeaderChange) {
      const headerContent = (
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchPlanStatistics={fetchPlanStatistics}
        />
      );
      onContentHeaderChange(headerContent);
    }
  }, [planStats, statsLoading, statsError, onContentHeaderChange, fetchPlanStatistics]);

  // Handle search changes from the table
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      <ExpensePlansTable
        {...contextProps}
        search={searchTerm}
        onSearchChange={handleSearchChange}
        employeeId={props.employeeId}
      />
    </div>
  );
};

export default ExpensePlansTab;
