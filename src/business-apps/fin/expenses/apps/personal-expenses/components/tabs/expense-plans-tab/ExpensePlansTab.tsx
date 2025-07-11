import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import ExpensePlansTable from './ExpensePlansTable';
import { useGetExpensePlans } from '../../../hooks/useGetExpensePlans';
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
    handleFilterChange,
    clearFilters,
    setFilters,
    search,
    setSearch,
    graphqlFilters,
  } = useExpensePlanFilters();

  // Fetch paginated data for the table
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(props);
  
  // Fetch all data for the statistics cards
  const { items: allPlans, isLoading: statsLoading, error: statsError, fetchItems: fetchAllItems } = useGetExpensePlans(props);

  useEffect(() => {
    fetchItems(graphqlFilters, currentPage, pageSize);
  }, [fetchItems, graphqlFilters, currentPage, pageSize]);

  useEffect(() => {
    // Fetch all items with a high limit for statistics, ignoring filters
    fetchAllItems({}, 1, 1000);
  }, [fetchAllItems]);

  const contentHeader = useMemo(() => {
    return <ExpensePlanStatistics plans={allPlans} statsLoading={statsLoading} statsError={statsError ? new Error(statsError) : null} />;
  }, [allPlans, statsLoading, statsError]);

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
      items={items}
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
