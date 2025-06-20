import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpensePlans } from '../../../hooks/useGetExpensePlans';
import ExpensePlanStatistics from './ExpensePlanStatistics';
import ExpensePlansTable from './ExpensePlansTable';

export interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Fetch all expense plans for statistics
  const { items: allPlans, fetchItems } = useGetExpensePlans(contextProps);
  
  // State for search coordination
  const [searchTerm, setSearchTerm] = useState('');

  // Load all items for statistics when component mounts
  useEffect(() => {
    if (contextProps.accessToken) {
      // Fetch all items for statistics display (large page size)
      fetchItems('', 1, 1000);
    }
  }, [contextProps.accessToken, fetchItems]);

  // Create memoized content header with statistics component
  const contentHeader = useMemo(() => {
    return allPlans && allPlans.length > 0 ? (
      <ExpensePlanStatistics plans={allPlans} />
    ) : null;
  }, [allPlans]);
  
  // Update the content header when it changes
  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  // Handle search term changes from table
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  return (
    <ExpensePlansTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
    />
  );
};

export default ExpensePlansTab;
