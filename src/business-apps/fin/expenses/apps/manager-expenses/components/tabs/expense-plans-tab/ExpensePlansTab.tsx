import React, { useState, useMemo, useCallback } from "react";
import { PiFileText } from "react-icons/pi";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer";
import {
  ExpensePlan,
  useMainViewExpensePlans,
} from "../../../hooks/useMainViewExpensePlans";
import { useExpensePlanFilters } from "../../../hooks/useExpensePlanFilters";
import { ExpenseStatus } from "../../../utils";
import ExpensePlanStatisticsDisplay from "./ExpensePlanStatistics";
import ExpensePlansTable from "./ExpensePlansTable";
import ExpensePlanDetails from "./ExpensePlanDetails";

interface ExpensePlansTabProps extends BusinessAppContextProps {
  employeeId?: string;
  moduleColor?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || '';
  
  // Use the expense plan filters hook with accessToken and managerId for dynamic currency data
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currencyFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  } = useExpensePlanFilters({
    accessToken: props.accessToken,
    managerId
  });

  // Use the statistics-only hook to get KPI data without interfering with table data
  const {
    planStats,
    statsLoading,
    statsError,
    approvePlan,
    rejectPlan,
  } = useMainViewExpensePlans({
    ...contextProps,
    currentCurrencyFilter: currencyFilter,
    statisticsOnly: true // This prevents race conditions with the table data
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

  // Handle approve plan
  const handleApprovePlan = useCallback(
    async (planId: string) => {
      try {
        await approvePlan(planId, ""); // Default empty comments - could be enhanced with modal later
        setSelectedPlan(null); // Close details panel after successful approval
      } catch (error) {
        // Error handling is done inside approvePlan function
        console.error("Failed to approve plan:", error);
      }
    },
    [approvePlan]
  );

  // Handle reject plan
  const handleRejectPlan = useCallback(
    async (planId: string) => {
      try {
        await rejectPlan(planId, "Rejected via details panel"); // Default reason - could be enhanced with modal later
        setSelectedPlan(null); // Close details panel after successful rejection
      } catch (error) {
        // Error handling is done inside rejectPlan function
        console.error("Failed to reject plan:", error);
      }
    },
    [rejectPlan]
  );

  // Handle search term changes
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search);
    },
    [setSearchTerm]
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
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Statistics Section */}
      <div className="gba:mb-6">
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          activeFilter={statusFilter}
          onFilterChange={(filter) => setStatusFilter(filter ? [filter as unknown as ExpenseStatus] : [])}
          currencyFilter={currencyFilter}
          fetchPlanStatistics={() => {}}
        />
      </div>

      {/* Data Container with floating details */}
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
            search: searchTerm,
            filter: statusFilter,
            setSearch: handleSearchChange,
            setFilter: (newFilters) => {
              // Convert filters to string IDs for comparison
              const currentFilters = statusFilter.map(status => status as unknown as string);
              const incomingFilters = newFilters.map(status => status as unknown as string);
              
              // Find filters to remove and add
              const filtersToRemove = currentFilters.filter(f => !incomingFilters.includes(f));
              const filtersToAdd = incomingFilters.filter(f => !currentFilters.includes(f));
              
              // Apply filter changes
              filtersToRemove.forEach(filter => handleDataFilterChange(filter, false));
              filtersToAdd.forEach(filter => handleDataFilterChange(filter, true));
            },
            addButton: {
              onClick: () => {
                // TODO: Implement add plan functionality
                console.log("Add plan clicked");
              },
              label: "Add",
              "data-testid": "add-expense-plan-button"
            },
            filterLabelMap: filterLabelMap,
            listTitle: (
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span>
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:backoffice_expense_landing_page.plan_info_pl",
                      "Plans"
                    )}
                  </span>
                  <span className="gba:text-gray-500">(x)</span>
                </div>
              </div>
            ),
            debounceDelay: 300
          }}
          dataFilterProps={{
            filterGroups,
            onFilterChange: handleDataFilterChange
          }}
          dataBody={
            <div data-testid="expense-plans-table-container">
              <ExpensePlansTable
                {...contextProps}
                search={searchTerm}
                onSearchChange={handleSearchChange}
                activeFilter={statusFilter}
                onFilterChange={(filter) => setStatusFilter(filter ? [filter as unknown as ExpenseStatus] : [])}
                onClearFilters={clearAllFilters}
                employeeId={props.employeeId}
                onViewDetails={handleViewDetails}
                currencyFilter={currencyFilter}
              />
            </div>
          }
          dataDetails={selectedPlan ? {
            title: selectedPlan.title || 'Expense Plan Details',
            icon: <PiFileText />,
            content: (
              <ExpensePlanDetails
                {...contextProps}
                plan={selectedPlan}
                onApprove={handleApprovePlan}
                onReject={handleRejectPlan}
                {...contextProps} 
                // @ts-ignore - Component expects these props but TypeScript doesn't recognize them
              />
            ),
            onClose: handleCloseDetails,
            footer: null
          } : undefined}
        />
    </div>
  );
};

export default ExpensePlansTab;
