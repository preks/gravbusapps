import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import ExpensePlansTable from './ExpensePlansTable';
import { useGetExpensePlans } from '../../../hooks/useGetExpensePlans';
import { useGetExpensePlanStatistics } from '../../../hooks/useGetExpensePlanStatistics';
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import { useExpensePlanWidgetFilters, getActiveWidgetFromFilters } from '../../../hooks/useExpensePlanWidgetFilters';
import ExpensePlanStatistics from './ExpensePlanStatistics';
import dayjs from 'dayjs';
import { ExpenseStatus } from '../../../utils';

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);

  const {
    filterGroups,
    selectedFilters,
    setFilters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    getFilters,
    setStartDateRange,
    setEndDateRange,
    setPlanDateRange
  } = useExpensePlanFilters();
  
  const { items, isLoading, error, totalCount, fetchItems } = useGetExpensePlans(props);
  const { statistics, isLoading: statsLoading, error: statsError, fetchStatistics } = useGetExpensePlanStatistics(props);

  // Combine widget and table filters
  const finalFilters = useExpensePlanWidgetFilters(selectedFilters, activeWidget);

  // Synchronize activeWidget with selectedFilters when filters change externally
  useEffect(() => {
    const expectedActiveWidget = getActiveWidgetFromFilters(selectedFilters);
    if (expectedActiveWidget !== activeWidget) {
      setActiveWidget(expectedActiveWidget);
    }
  }, [selectedFilters, activeWidget]);

  // Helper function to get current month date range
  const getCurrentMonthRange = useCallback(() => {
    const today = dayjs();
    const currentMonthStart = today.startOf('month').toDate();
    const currentMonthEnd = today.endOf('month').toDate();
    return [currentMonthStart, currentMonthEnd] as [Date, Date];
  }, []);

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback((widgetKey: string) => {
    const newActiveWidget = activeWidget === widgetKey ? null : widgetKey;
    setActiveWidget(newActiveWidget);
    
    // Clear existing filters for all widget activations
    clearFilters();
    
    // Clear destination filter for all widgets except top-destinations
    if (newActiveWidget !== 'top-destinations') {
      setDestinationFilter(null);
    }
    
    // Apply widget-specific filter logic
    switch (newActiveWidget) {
      case 'total-plans':
        const currentMonthRange = getCurrentMonthRange();
        setPlanDateRange(currentMonthRange);
        handleFilterChange(ExpenseStatus.CLOSED, true);
        handleFilterChange(ExpenseStatus.PAID, true);
        break;
      case 'total-estimated':
        const today = dayjs();
        const currentMonthStart = today.startOf('month').toDate();
        const currentMonthEnd = today.endOf('month').toDate();
        setPlanDateRange([currentMonthStart, currentMonthEnd]);
        // Set status filters to exclude DRAFT (CREATED) and PAID
        const allStatuses = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          handleFilterChange(status, true);
        });
        break;
      case 'pending-approval':
        // Clear any existing date range filters
        setStartDateRange(null);
        setEndDateRange(null);
        // Set status filter to only show PENDING plans
        const allStatusesForPending = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'CLOSED', 'TRANSFERRED'];
        allStatusesForPending.forEach(status => {
          handleFilterChange(status, false);
        });
        handleFilterChange('PENDING', true);
        break;
      case 'top-destinations':
        // Clear any existing date range filters
        setStartDateRange(null);
        setEndDateRange(null);
        // Clear all status filters to show all plans for the destination
        const allStatusesForDestination = ['PREPARED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'CLOSED', 'TRANSFERRED'];
        allStatusesForDestination.forEach(status => {
          handleFilterChange(status, false);
        });
        // Set destination filter
        if (statistics.topDestination && statistics.topDestination !== 'N/A') {
          setDestinationFilter(statistics.topDestination);
        }
        break;
      case null:
        // Widget deactivated - filters already cleared above
        setDestinationFilter(null);
        break;
    }
  }, [activeWidget, clearFilters, handleFilterChange, setPlanDateRange, getCurrentMonthRange, setDestinationFilter, statistics.topDestination, setStartDateRange, setEndDateRange]);

  // Handle destination filter changes
  const handleDestinationFilterChange = useCallback((destination: string | null) => {
    setDestinationFilter(destination);
  }, [activeWidget]);

  // Handle clearing all filters (widget + table)
  const handleClearAllFilters = useCallback((filters: string[]) => {
    setFilters(filters);
    setActiveWidget(null);
    setDestinationFilter(null);
    // Also clear search and date ranges when clearing all filters
    if (filters.length === 0) {
      setSearch('');
      setStartDateRange(null);
      setEndDateRange(null);
      setPlanDateRange(null);
    }
  }, [setFilters, setSearch, setStartDateRange, setEndDateRange, setPlanDateRange]);

  // Helper function to build widget-specific filters
  const buildWidgetFilters = useCallback((baseFilters: any) => {
    const filters = { ...baseFilters };
    
    // Add total-estimated widget filters
    if (activeWidget === 'total-estimated') {
      const today = dayjs();
      const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss');
      
      const planDateCondition = {
        _and: [
          { planDate: { _gte: currentMonthStart } },
          { planDate: { _lte: currentMonthEnd } }
        ]
      };
      
      if (filters._and) {
        filters._and.push(planDateCondition);
      } else {
        filters._and = [planDateCondition];
      }
    }
    
    // Add top-destinations widget filters
    if (activeWidget === 'top-destinations' && destinationFilter && destinationFilter !== 'N/A') {
      const destinationCondition = {
        expenseRequestTrip: {
          pointType: { _eq: "DESTINATION_POINT" },
          travelRegion: {
            _or: [
              { value: { _eq: destinationFilter } },
              { translations: { value: { _eq: destinationFilter } } }
            ]
          }
        }
      };
      
      if (filters._and) {
        filters._and.push(destinationCondition);
      } else {
        filters._and = [destinationCondition];
      }
    }
    
    return filters;
  }, [activeWidget, destinationFilter]);

  // Memoize the filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => {
    const baseFilters = getFilters();
    return buildWidgetFilters(baseFilters);
  }, [getFilters, buildWidgetFilters]);

  // Only fetch when filters, page, or pageSize change
  useEffect(() => {
    fetchItems(
      memoizedFilters,
      currentPage,
      pageSize
    );
  }, [fetchItems, currentPage, pageSize, memoizedFilters]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Create filter label map for proper display labels
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {};
    
    // Map status values to their display labels
    const statusLabels = {
      [ExpenseStatus.PREPARED]: 'Prepared',
      [ExpenseStatus.CREATED]: 'Draft (Created)',
      [ExpenseStatus.PENDING]: 'In Approval (Pending)',
      [ExpenseStatus.ASSIGNED]: 'Assigned',
      [ExpenseStatus.APPROVED]: 'Approved',
      [ExpenseStatus.REJECTED]: 'Revision Required (Rejected)',
      [ExpenseStatus.VERIFIED]: 'In Transit (Verified)',
      [ExpenseStatus.BOOKED]: 'In Transit (Booked)',
      [ExpenseStatus.PAID]: 'Paid',
      [ExpenseStatus.CLOSED]: 'Closed',
      [ExpenseStatus.TRANSFERRED]: 'In Transit (Transferred)',
    };
    
    // Add all status mappings
    Object.entries(statusLabels).forEach(([status, label]) => {
      labelMap[status] = label;
    });
    
    return labelMap;
  }, []);

  // Memoize content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return <ExpensePlanStatistics 
      plans={items} 
      currentMonthTotal={statistics.currentMonthTotal} 
      previousMonthTotal={statistics.previousMonthTotal} 
      totalEstimated={statistics.totalEstimated} 
      pendingApproval={statistics.pendingApproval} 
      topDestination={statistics.topDestination} 
      statsLoading={statsLoading} 
      statsError={statsError ? new Error(statsError) : null}
      onWidgetClick={handleWidgetClick}
      activeWidgetKey={activeWidget ?? undefined}
      currentMonthClosedPlans={statistics.currentMonthClosedPlans}
      previousMonthClosedPlans={statistics.previousMonthClosedPlans}
    />;
  }, [items, statistics, statsLoading, statsError, handleWidgetClick, activeWidget]);

  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader);
    }
  }, [props.onContentHeaderChange, contentHeader]);

  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
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
      selectedFilters={finalFilters}
      setFilters={handleClearAllFilters}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      clearFilters={clearFilters}
      filterLabelMap={filterLabelMap}
    />
  );
};

export default ExpensePlansTab;
