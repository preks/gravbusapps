"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { useGetEmployees, Employee } from '@/business-apps/hr/core/hooks/useGetEmployees';
import { useEmployeeFilters } from '@/business-apps/hr/core/hooks/useEmployeeFilters';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DebouncedDataController, DebouncedDataControllerProps } from '@/components/dataController';
import { DataCards } from '@/components/dataCards';
import { PiUsersThree } from 'react-icons/pi';
import { EmployeeCard } from './components/EmployeeCard.component';
import EmployeeDetails from '@/business-apps/hr/components/employeeDetails';
//import { useTranslation } from 'react-i18next';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

/**
 * Employee Directory page component. Renders the employee directory module with grid, infinite scroll, and alphabet filter.
 * @returns {JSX.Element}
 */

export const EmployeeDirectory: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props;
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
  
  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Use the appropriate function directly
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);
  
  // Track selected employee for details panel
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  //const { t } = useTranslation('employee_directory', { keyPrefix: 'employee_directory' });
  
  const {
    employees,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    retry
  } = useGetEmployees({ ...getFilters(), accessToken });
  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    if (!loaderRef.current || !hasMore || !scrollContainerRef.current) return;
    const observer = new window.IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { root: scrollContainerRef.current }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loaderRef, hasMore, loading, loadMore]); // loadMore is now memoized, so this effect will not retrigger endlessly

  // Handle employee selection - toggle selection when clicked a second time
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee((prev: Employee | null) => prev?.id === employee.id ? null : employee);
  }, []);

  // Handle click outside of employee cards to close details
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    // Check if the click is outside of any employee card
    const target = e.target as HTMLElement;
    const isOutsideEmployeeCard = !target.closest('.employee-card-wrapper');
    
    if (isOutsideEmployeeCard && selectedEmployee) {
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
      <PageLayout
        headerIcon={<PiUsersThree size={32}/>}
        headerLabel={'Employee Directory'}
        contentHeader={null}
        contentContainer={
          <DataContainer<DebouncedDataControllerProps>
            dataControllerComponent={DebouncedDataController}
            dataControllerProps={{
              // Props for debounced controller
              actualSearch: search,
              setActualSearch: setSearch,
              debounceDelay: 300, // 300ms debounce delay
              
              // These are required by the type system but won't actually be used
              // The DebouncedDataController will override them with its own values
              search: '', // Placeholder, will be ignored
              setSearch: () => {}, // Placeholder, will be ignored
              
              // Regular DataController props
              filter: selectedFilters,
              setFilter: setSelectedFilters,
              filterLabelMap: filterLabelMap,
              listTitle: 'Employees',
              listIcon: <PiUsersThree size={20} />,
              listAmount: total,
            }}
            dataFilterProps={{
              filterGroups: filterGroups,
              onFilterChange: handleFilterChange,
            }}
            dataBody={
              <DataCards
                items={employees}
                getKey={(emp) => emp.id}
                renderItem={(emp: Employee) => (
                  <div 
                    className={`gba:cursor-pointer ${selectedEmployee?.id === emp.id ? 'gba:ring-2 gba:ring-primary-500 gba:bg-gray-50' : ''}`}
                    onClick={() => handleEmployeeSelect(emp)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEmployeeSelect(emp);
                      }
                    }}
                    aria-pressed={selectedEmployee?.id === emp.id}
                  >
                    <EmployeeCard employee={emp} />
                  </div>
                )}
                hasMore={hasMore}
                loading={loading}
                error={error ? 'Failed to load employees.' : null}
                onLoadMore={loadMore}
                onRetry={retry}
                emptyMessage="No employees found."
              />
            }
            floatingDetails={true}
            dataDetails={
              selectedEmployee ? {
                title: 'Employee Details',
                icon: <PiUsersThree size={20} />,
                content: <EmployeeDetails employee={selectedEmployee} />,
                // No footer needed here as the EmployeeDetails component has its own action buttons
              } : undefined
            }
          />
        }
      />
  );
};

export default EmployeeDirectory;
