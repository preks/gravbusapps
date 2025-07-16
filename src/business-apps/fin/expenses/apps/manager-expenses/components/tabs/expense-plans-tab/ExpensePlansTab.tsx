import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PiFileText } from 'react-icons/pi';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
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
import { DataContainer } from '@/components/layout/dataContainer';
import { useMainViewExpensePlans, ExpensePlan } from '../../../hooks/useMainViewExpensePlans';
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics';
import ExpensePlansTable from './ExpensePlansTable';
import ExpensePlanDetails from './ExpensePlanDetails';

interface ExpensePlansTabProps extends BusinessAppContextProps {
  employeeId?: string;
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = (props) => {
  const { accessToken, userInfo } = props;

  // State for filter and search
  const [activeFilter, setActiveFilter] = useState<ExpenseStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null);

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

  // Handle plan selection for details panel
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    setSelectedPlan(plan);
  }, []);

  // Handle closing details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedPlan(null);
  }, []);

  // Handle approve plan
  const handleApprovePlan = useCallback((planId: string) => {
    // TODO: Implement approve functionality
    console.log('Approve plan:', planId);
    setSelectedPlan(null);
  }, []);

  // Handle reject plan
  const handleRejectPlan = useCallback((planId: string) => {
    // TODO: Implement reject functionality
    console.log('Reject plan:', planId);
    setSelectedPlan(null);
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
      employeeId: props.employeeId
    });
  }, []);

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo(() => [
    {
      id: 'status',
      title: 'Status',
      filters: [
        { id: 'PENDING', label: 'Pending', selected: activeFilter === ExpenseStatus.PENDING },
        { id: 'APPROVED', label: 'Approved', selected: activeFilter === ExpenseStatus.APPROVED },
        { id: 'REJECTED', label: 'Rejected', selected: activeFilter === ExpenseStatus.REJECTED },
        { id: 'CREATED', label: 'Created', selected: activeFilter === ExpenseStatus.CREATED },
        { id: 'CLOSED', label: 'Closed', selected: activeFilter === ExpenseStatus.CLOSED },
      ]
    }
  ], [activeFilter]);

  // Handle filter changes from DataFilter
  const handleDataFilterChange = useCallback((filterId: string, selected: boolean) => {
    if (selected) {
      setActiveFilter(filterId as ExpenseStatus);
    } else {
      setActiveFilter(null);
    }
  }, []);

  // Handle clearing all filters from DataController
  const handleSetFilter = useCallback((filters: string[]) => {
    if (filters.length === 0) {
      setActiveFilter(null);
    }
  }, []);

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Statistics Section - Now inside the tab content */}
      <div className="gba:mb-6">
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchPlanStatistics={fetchPlanStatistics}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>
      
      {/* Data Container with persistent sidebar */}
      <div className="gba:flex-1 gba:overflow-hidden">
        <DataContainer
          contentBackground="white"
          floatingDetails={true}
          dataControllerProps={{
            search: searchTerm,
            setSearch: handleSearchChange,
            debounceDelay: 500,
            filter: activeFilter ? [activeFilter] : [],
            setFilter: handleSetFilter,
            filterLabelMap: { [activeFilter || '']: activeFilter || '' },
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
            onFilterChange: handleDataFilterChange
          }}
          dataBody={
            <div data-testid="expense-plans-table-container">
              <ExpensePlansTable
                {...contextProps}
                search={searchTerm}
                onSearchChange={handleSearchChange}
                onFilterChange={handleFilterChange}
                onClearFilters={clearAllFilters}
                employeeId={props.employeeId}
                activeFilter={activeFilter}
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
            footer: null // Remove footer close button as it's now in the details component
          } : undefined}
        />
      </div>
    </div>
  );
};

export default ExpensePlansTab;
