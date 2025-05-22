"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { useGetEmployees, Employee } from '@/business-apps/hr/hooks/useGetEmployees';
import { useEmployeeFilters } from '@/business-apps/hr/hooks/useEmployeeFilters';
import { EmployeeTable } from './components/EmployeeTable';
import EmployeeDetails from '@/business-apps/hr/components/employeeDetails';
import { PiUsersThree } from 'react-icons/pi';

/**
 * Employee List page component. Renders the employee list module with a table view.
 * @returns {JSX.Element}
 */
export const EmployeeList: React.FC = () => {
  const { t } = useTranslation();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Use the centralized employee filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  } = useEmployeeFilters();
  
  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Use the appropriate function directly
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  // Memoize the filters to prevent unnecessary re-renders
  const filters = React.useMemo(() => getFilters(), [
    // Include all dependencies that getFilters() depends on
    search, 
    selectedFilters
  ]);

  // Get employee data with filters from the centralized hook
  const { 
    employees, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    retry 
  } = useGetEmployees(filters);
  
  // Trigger initial data loading when component mounts or filters change
  // We use a ref to ensure we only load data once per filter change
  const initialLoadRef = React.useRef(false);
  
  useEffect(() => {
    // Only load data if this is the first render or filters have changed
    if (!initialLoadRef.current) {
      loadMore();
      initialLoadRef.current = true;
    }
  }, [filters, loadMore]);
  
  // Reset the initialLoadRef when filters change
  useEffect(() => {
    initialLoadRef.current = false;
  }, [filters]);
  
  // Handle employee selection
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
  }, []);
  
  // Handle click outside of employee table to close details
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    // Check if the click is outside of the employee table
    const target = e.target as HTMLElement;
    const isOutsideEmployeeTable = !target.closest('[data-testid="employee-table-container"]');
    
    if (isOutsideEmployeeTable && selectedEmployee) {
      setSelectedEmployee(null);
    }
  }, [selectedEmployee]);
  
  // Add and remove click listener for outside clicks
  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  return (
    <div className="w-full h-screen flex flex-row relative bg-white">
      <PageLayout
        variant="default"
        headerIcon={<PiUsersThree size={24} className="text-primary" />}
        headerLabel={t('employee.list_title', 'Employee List')}
        contentContainer={
          <DataContainer
            contentBackground="white" // Set the content background to white
            dataControllerProps={{
              search,
              setSearch,
              filter: selectedFilters,
              setFilter: setSelectedFilters,
              filterLabelMap: filterLabelMap,
              listTitle: t('employee.list_title', 'Employees'),
              listIcon: <PiUsersThree size={20} />,
              listAmount: total,
            }}
            dataFilterProps={{
              filterGroups: filterGroups,
              onFilterChange: handleFilterChange,
            }}
            dataBody={
              <div data-testid="employee-table-container">
                <EmployeeTable
                  employees={employees}
                  loading={loading}
                  error={error}
                  hasMore={hasMore}
                  loadMore={loadMore}
                  retry={retry}
                  total={total}
                  onSelectEmployee={handleEmployeeSelect}
                  selectedEmployeeId={selectedEmployee?.id}
                />
              </div>
            }
            dataDetails={
              selectedEmployee ? {
                title: t('employee.details_title', 'Employee Details'),
                icon: <PiUsersThree size={20} />,
                content: <EmployeeDetails employee={selectedEmployee} />,
              } : undefined
            }
          />
        }
      />
    </div>
  );
};

export default EmployeeList;
