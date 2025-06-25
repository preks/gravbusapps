"use client";

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DataController, DataControllerProps } from '@/components/dataController';
import { useGetEmployees, Employee } from '@/business-apps/hr/core/hooks/useGetEmployees';
import { useEmployeeFilters } from '@/business-apps/hr/core/hooks/useEmployeeFilters';
import { EmployeeTable } from './components/EmployeeTable';
import EmployeeDetails from '@/business-apps/hr/components/employeeDetails';
import { PiUsersThree,PiUsersThreeDuotone } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';

/**
 * Employee List page component. Renders the employee list module with a table view.
 * @returns {JSX.Element}
 */
export const EmployeeList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props;
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
  } = useEmployeeFilters(accessToken);
  
  // Handle adding a new employee
  const handleAddEmployee = useCallback(() => {
    startProcess({
      domain: 'employee',
      processName: 'saveEmployee',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
  }, []);

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Use the appropriate function directly
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  // Get employee data with filters from the centralized hook
  const { 
    employees, 
    total, 
    loading, 
    error, 
    loadPage,
    retry 
  } = useGetEmployees({ ...getFilters(), accessToken });
  
  // Initial load effect - only runs when component mounts and accessToken is available
  React.useEffect(() => {
    if (accessToken && !loading && employees.length === 0) {
      loadPage(1); // Load first page instead of loadMore for true pagination
    }
  }, [accessToken, loadPage, loading, employees.length]);
  
  // Handle employee selection
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
  }, []);
  
  // Handle details panel close
  const handleDetailsPanelClose = useCallback(() => {
    setSelectedEmployee(null);
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
  React.useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  return (
    <div >
      <PageLayout
        variant="default"
        headerIcon={<PiUsersThreeDuotone color='#254469'/>}
        headerLabel={t('employee.list_title', 'Employee List')}
        contentContainer={
          <DataContainer<DataControllerProps>
            contentBackground="white" // Set the content background to white
            floatingDetails={true} // Enable floating details variant
            onDetailsPanelClose={handleDetailsPanelClose} // Handle details panel close
            dataControllerComponent={DataController}
            dataControllerProps={{
              // Props with debounce functionality now built into DataController
              search: search,
              setSearch: setSearch,
              debounceDelay: 300, // 300ms debounce delay
              
              // Regular DataController props
              filter: selectedFilters,
              setFilter: setSelectedFilters,
              filterLabelMap: filterLabelMap,
              listTitle: t('employee.list_title', 'Employees'),
              listIcon: <PiUsersThree size={20} />,
              listAmount: total,
              addButton: {
                onClick: handleAddEmployee,
                label: 'Add',
                'data-testid': 'add-employee-button'
              },
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
                  loadPage={loadPage}
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
                onClose: handleDetailsPanelClose,
              } : undefined
            }
          />
        }
      />
    </div>
  );
};

export default EmployeeList;
