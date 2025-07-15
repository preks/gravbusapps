import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import ExpensePlansTable from './ExpensePlansTable';
import { useGetExpensePlans } from '../../../hooks/useGetExpensePlans';
import { useGetExpensePlanStatistics } from '../../../hooks/useGetExpensePlanStatistics';
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import ExpensePlanStatistics from './ExpensePlanStatistics';

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const {
  filterGroups,
  selectedFilters,
  setFilters,
  handleFilterChange,
  clearFilters,
  search,
  setSearch,
  getFilters
} = useExpensePlanFilters();
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(props);
  const { statistics, isLoading: statsLoading, error: statsError, fetchStatistics } = useGetExpensePlanStatistics(props);

  useEffect(() => {
    fetchItems(
      getFilters(),
      currentPage,
      pageSize
    );
  }, [fetchItems, currentPage, pageSize, JSON.stringify(getFilters())]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const contentHeader = useMemo(() => {
    // We need to fetch all plans for the other statistics for now.
    // TODO: Refactor other statistics to be server-side as well.
    return <ExpensePlanStatistics 
      plans={items} 
      currentMonthTotal={statistics.currentMonthTotal} 
      previousMonthTotal={statistics.previousMonthTotal} 
      totalEstimated={statistics.totalEstimated} 
      pendingApproval={statistics.pendingApproval} 
      topDestination={statistics.topDestination} 
      statsLoading={statsLoading} 
      statsError={statsError ? new Error(statsError) : null} />;
  }, [items, statistics, statsLoading, statsError]);

  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  const handleTableChange = useCallback((pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  return (
    <ExpensePlansTable
      {...props}
      items={items.filter(plan => plan.status !== 'DISCARDED')}
      isLoading={isLoading}
      error={error}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      onTableChange={handleTableChange}
      search={search}
      onSearchChange={setSearch}
      selectedFilters={selectedFilters}
      setFilters={setFilters}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      clearFilters={clearFilters}
    />
  );
};

export default ExpensePlansTab;
