import React, { useState, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import useGetExpensePlans from '../../../hooks/useGetExpensePlans';
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

  // Use hook only for statistics with a large page size
  const {
    planStats,
    statsLoading,
    statsError,
    fetchPlanStatistics,
  } = useGetExpensePlans({
    accessToken,
    userInfo,
    pageSize: 1000, // Large page size for statistics
  });





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
    <ExpensePlansTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
      employeeId={props.employeeId}
    />
  );
};

export default ExpensePlansTab;
