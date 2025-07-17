import React, { useState, useMemo, useCallback } from 'react';
import { PiFileText } from 'react-icons/pi';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer';
import { ExpensePlan, useMainViewExpensePlans } from '../../../hooks/useMainViewExpensePlans';
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters';
import { ExpenseStatus } from '../../../utils';
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics';
import ExpensePlansTable from './ExpensePlansTable';
import ExpensePlanDetails from './ExpensePlanDetails';

interface ExpensePlansTabProps extends BusinessAppContextProps {
  employeeId?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use the expense plan filters hook (same pattern as expense items)
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
  } = useExpensePlanFilters();

  // Use the statistics-only hook to get KPI data without interfering with table data
  const {
    planStats,
    statsLoading,
    statsError,
    fetchPlanStatistics,
    approvePlan,
    rejectPlan
  } = useMainViewExpensePlans({
    ...contextProps,
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
  const handleApprovePlan = useCallback(async (planId: string) => {
    try {
      await approvePlan(planId, ''); // Default empty comments - could be enhanced with modal later
      setSelectedPlan(null); // Close details panel after successful approval
    } catch (error) {
      // Error handling is done inside approvePlan function
      console.error('Failed to approve plan:', error);
    }
  }, [approvePlan]);

  // Handle reject plan
  const handleRejectPlan = useCallback(async (planId: string) => {
    try {
      await rejectPlan(planId, 'Rejected via details panel'); // Default reason - could be enhanced with modal later
      setSelectedPlan(null); // Close details panel after successful rejection
    } catch (error) {
      // Error handling is done inside rejectPlan function
      console.error('Failed to reject plan:', error);
    }
  }, [rejectPlan]);

  // Handle search term changes
  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, [setSearchTerm]);

  // Handle filter changes (only log when user actually clicks)
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    console.log('🔥 Filter clicked:', { filterId, selected }); // Only log on actual clicks
    handleDataFilterChange(filterId, selected);
  }, [handleDataFilterChange]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Statistics Section */}
      <div className="gba:mb-6">
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchPlanStatistics={fetchPlanStatistics}
          activeFilter={statusFilter}
          onFilterChange={(filter) => setStatusFilter(filter || [])}
        />
      </div>
      
      {/* Data Container with persistent sidebar */}
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
            search: searchTerm,
            filter: statusFilter,
            setSearch: handleSearchChange,
            setFilter: (newFilters) => {
              const filtersToRemove = statusFilter.filter(f => !newFilters.includes(f));
              if (filtersToRemove.length > 0) {
                console.log('🔥 Filters removed:', filtersToRemove); // Only log when filters actually removed
              }
              setStatusFilter(newFilters as ExpenseStatus[]);
            },
            addButton: {
              onClick: () => {
                // TODO: Implement add plan functionality
                console.log('Add plan clicked');
              },
              label: 'Add',
              'data-testid': 'add-expense-plan-button'
            },
            filterLabelMap: filterLabelMap,
            listTitle: (
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span>{getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.plan_info_pl', 'Plans')}</span>
                  <span className="gba:text-gray-500">(x)</span>
                </div>
              </div>
            ),
          }}
          dataFilterProps={{
            filterGroups,
            onFilterChange: handleFilterChange
          }}
          dataBody={
            <div data-testid="expense-plans-table-container">
              <ExpensePlansTable
                {...contextProps}
                search={searchTerm}
                activeFilter={statusFilter}
                employeeId={props.employeeId}
                onViewDetails={handleViewDetails}
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
