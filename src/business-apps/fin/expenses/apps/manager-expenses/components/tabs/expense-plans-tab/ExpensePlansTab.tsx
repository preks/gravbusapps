import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Define ExpenseStatus locally
enum ExpenseStatus {
  PREPARED = "PREPARED",
  CREATED = "CREATED",
  ASSIGNED = "ASSIGNED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  RETURNED = "RETURNED",
  REJECTED = "REJECTED",
  VERIFIED = "VERIFIED",
  BOOKED = "BOOKED",
  PAID = "PAID",
  CLOSED = "CLOSED",
  DISCARDED = "DISCARDED",
  TRANSFERRED = "TRANSFERRED",
}
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

  // State for filter and search
  const [activeFilter, setActiveFilter] = useState<ExpenseStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Handle filter change from child components
  const handleFilterChange = useCallback((filter: ExpenseStatus | null) => {
    console.log('Filter changed to:', filter);
    setActiveFilter(filter);
  }, []);

  // Handle search term change
  const handleSearchChange = useCallback((search: string) => {
    console.log('Search term changed to:', search);
    setSearchTerm(search);
  }, []);

  // Clear all filters and search
  const clearAllFilters = useCallback(() => {
    console.log('Clearing all filters');
    setActiveFilter(null);
    setSearchTerm('');
  }, []);

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo,
    activeFilter,
    onFilterChange: handleFilterChange,
    search: searchTerm,
    onSearchChange: handleSearchChange,
    onClearFilters: clearAllFilters
  }), [props.accessToken, props.userInfo, activeFilter, searchTerm, handleFilterChange, handleSearchChange, clearAllFilters]);

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
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      );
      onContentHeaderChange(headerContent);
    }
  }, [planStats, statsLoading, statsError, fetchPlanStatistics, activeFilter, handleFilterChange, onContentHeaderChange]);

  // Handle search changes from the table is now handled by the handleSearchChange callback

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      <ExpensePlansTable
        {...contextProps}
        search={searchTerm}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onClearFilters={clearAllFilters}
        employeeId={props.employeeId}
        activeFilter={activeFilter}
      />
    </div>
  );
};

export default ExpensePlansTab;
