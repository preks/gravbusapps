import React, { useState, useMemo, useCallback } from "react";
import { PiFileText } from "react-icons/pi";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer";
import { ExpensePlan, useMainViewExpensePlans } from "../../../hooks/useMainViewExpensePlans";
import { useExpensePlanFilters } from "../../../hooks/useExpensePlanFilters";
import ExpensePlanStatisticsDisplay from "./ExpensePlanStatistics";
import ExpensePlansTable from "./ExpensePlansTable";
import ExpensePlanDetails from "./ExpensePlanDetails";

interface ExpensePlansTabProps extends BusinessAppContextProps {
  employeeId?: string;
  moduleColor?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
    }),
    [props.accessToken, props.userInfo],
  );

  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || "";

  // Use the expense plan filters hook with accessToken and managerId for dynamic currency data
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    primaryCurrency, // Use primaryCurrency instead of currencyFilter
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  } = useExpensePlanFilters({
    accessToken: props.accessToken,
    managerId,
  });

  // State for page size
  const [pageSize, setPageSize] = useState<number>(10);

  // Use the statistics-only hook to get KPI data without interfering with table data
  const { planStats, statsLoading, statsError } = useMainViewExpensePlans({
    ...contextProps,
    currentCurrencyFilter: primaryCurrency, // Use primaryCurrency from filters hook
    statisticsOnly: true, // This prevents race conditions with the table data
  });

  // Use the main data hook to fetch expense plans data
  const {
    plans: expensePlans,
    loading: plansLoading,
    error: plansError,
    totalCount,
    currentPage,
    setCurrentPage,
    sorting,
    updateSorting,
  } = useMainViewExpensePlans({
    ...contextProps,
    pageSize,
    searchTerm,
    currentStatusFilter: statusFilter,
    currentCurrencyFilter: primaryCurrency,
    statisticsOnly: false, // This fetches the main data
  });

  // State for selected plan details
  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null);

  // Handle plan selection for details panel
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    setSelectedPlan(plan);
  }, []);

  // Handle closing details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedPlan(null);
  }, []);

  // Handle search term changes
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search);
    },
    [setSearchTerm],
  );

  // No need for separate status filter handler as we use handleDataFilterChange

  // Use the handleDataFilterChange function directly from the hook
  // This handles both status and currency filters

  // Handle clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter([]);
  }, [setSearchTerm, setStatusFilter]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-plans-tab-container">
      {/* Statistics Section */}
      <div className="gba:mb-6">
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          activeFilter={statusFilter}
          onFilterChange={(filter) => setStatusFilter(filter || [])}
          currencyFilter={primaryCurrency}
          fetchPlanStatistics={() => {}}
        />
      </div>

      {/* Data Container with floating details */}
      <DataContainer
        key="expense-plans-data-container"
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
                    "lowcoder:backoffice_expense_landing_page.plan_info_pl",
                    "Plans",
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
          <div data-testid="expense-plans-table-container">
            <ExpensePlansTable
              {...contextProps}
              search={searchTerm}
              onSearchChange={handleSearchChange}
              activeFilter={statusFilter}
              onFilterChange={(filter) => setStatusFilter(filter || [])}
              onClearFilters={clearAllFilters}
              employeeId={props.employeeId}
              onViewDetails={handleViewDetails}
              currencyFilter={primaryCurrency}
              // Pass data from the main hook
              expensePlans={expensePlans}
              loading={plansLoading}
              error={plansError}
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
        dataDetails={
          selectedPlan
            ? {
                title: selectedPlan.title || "Expense Plan Details",
                icon: <PiFileText />,
                content: (
                  <ExpensePlanDetails
                    {...contextProps}
                    selectedItem={selectedPlan}
                    onClose={handleCloseDetails}
                  />
                ),
                onClose: handleCloseDetails,
                footer: null,
              }
            : undefined
        }
      />
    </div>
  );
};

export default ExpensePlansTab;
