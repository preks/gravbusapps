import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer';
import { useMainViewAdvancePayments } from '../../../hooks/useMainViewAdvancePayments';
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import AdvancePaymentStatistics from './AdvancePaymentStatistics';
import AdvancePaymentsTable from './AdvancePaymentsTable';

interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  moduleColor?: string;
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || '';
  
  // Use the advance payment filters hook with accessToken and managerId for dynamic currency data
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currencyFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  } = useAdvancePaymentFilters({
    accessToken: props.accessToken,
    managerId
  });

  // State for page size
  const [pageSize, setPageSize] = useState<number>(10);

  // Use the statistics-only hook to get KPI data
  const {
    paymentStats: advancePaymentStats,
    statsLoading,
    statsError,
    fetchPaymentStatistics: fetchAdvancePaymentStatistics,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize: 1000,
    currentCurrencyFilter: currencyFilter,
    statisticsOnly: true, // This prevents race conditions with the table data
  });
  
  // Use the main data hook to fetch advance payments data for the table
  const {
    payments: advancePayments,
    loading: paymentsLoading,
    error: paymentsError,
    totalCount,
    currentPage,
    setCurrentPage,
    sorting,
    updateSorting,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize,
    searchTerm,
    currentStatusFilter: statusFilter,
    currentCurrencyFilter: currencyFilter,
    statisticsOnly: false, // This fetches the main data
  });
  
  // Fetch statistics on component mount
  useEffect(() => {
    fetchAdvancePaymentStatistics();
  }, [fetchAdvancePaymentStatistics]);

  // Handle search term changes
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search);
    },
    [setSearchTerm],
  );

  // Handle clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter([]);
  }, [setSearchTerm, setStatusFilter]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="advance-payments-tab-container">
      {/* Statistics Section */}
      <div className="gba:mb-6">
        <AdvancePaymentStatistics 
          advancePaymentStats={advancePaymentStats} 
          statsLoading={statsLoading} 
          statsError={statsError} 
          fetchAdvancePaymentStatistics={fetchAdvancePaymentStatistics} 
        />
      </div>
      
      {/* Data Container with Table */}
      <DataContainer
        key="advance-payments-data-container"
        contentBackground="white"
        dataControllerProps={{
          search: searchTerm,
          filter: statusFilter,
          setSearch: handleSearchChange,
          setFilter: (newFilters) => {
            // Convert filters to string IDs for comparison
            const currentFilters = statusFilter.map((status) => status as unknown as string);
            const incomingFilters = newFilters.map((status) => status as unknown as string);

            // Find filters to remove and add
            const filtersToRemove = currentFilters.filter((f) => !incomingFilters.includes(f));
            const filtersToAdd = incomingFilters.filter((f) => !currentFilters.includes(f));

            // Apply filter changes
            filtersToRemove.forEach((filter) => handleDataFilterChange(filter, false));
            filtersToAdd.forEach((filter) => handleDataFilterChange(filter, true));
          },
          filterLabelMap: filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:backoffice_expense_landing_page.advance_title",
                    "Advance Payments",
                  )}
                </span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          debounceDelay: 300,
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleDataFilterChange,
        }}
        dataBody={
          <div data-testid="advance-payments-table-container">
            <AdvancePaymentsTable
              {...contextProps}
              search={searchTerm}
              onSearchChange={handleSearchChange}
              activeFilter={statusFilter}
              onFilterChange={(filter) => setStatusFilter(filter || [])}
              onClearFilters={clearAllFilters}
              currencyFilter={currencyFilter}
              // Pass data from the main hook
              advancePayments={advancePayments}
              loading={paymentsLoading}
              error={paymentsError}
              totalCount={totalCount}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              sorting={sorting}
              updateSorting={updateSorting}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          </div>
        }
      />
    </div>
  );
};

export default AdvancePaymentsTab;
