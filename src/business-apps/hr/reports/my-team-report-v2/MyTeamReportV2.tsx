"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DataController, DataControllerProps } from '@/components/dataController';

import { useGetEmployeesReport, Employee } from './hooks/useGetEmployeesReport';
import { useTeamReportV2Filters } from './hooks/useTeamReportV2Filters';
import { TeamReportTable } from './components/TeamReportTable';
import EmployeeDetails from '@/business-apps/hr/components/employeeDetails';
import { PiUsersThree } from 'react-icons/pi';
import { CalendarOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';

/**
 * My Team Report V2 page component. Renders the team member list with a table view.
 * @returns {JSX.Element}
 */
export const MyTeamReportV2: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props;
  const { t } = useTranslation();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch all employees. Filtering and pagination will be done on the client side.
  const {
    employees: allEmployees,
    loading,
    error,
    retry,
  } = useGetEmployeesReport({ accessToken: accessToken || '' });

  // Extract unique filter options from all employees
  const uniquePositions = useMemo(() => [...new Set(allEmployees.map(e => e.jobPosition).filter((p): p is string => !!p))], [allEmployees]);
  const uniqueLocations = useMemo(() => [...new Set(allEmployees.map(e => e.location).filter((l): l is string => !!l))], [allEmployees]);
  const uniqueEmploymentTypes = useMemo(() => [...new Set(allEmployees.map(e => e.employmentType).filter((t): t is string => !!t && t !== ''))], [allEmployees]);
  const uniqueContractTypes = useMemo(() => [...new Set(allEmployees.map(e => e.contractType).filter((t): t is string => !!t && t !== ''))], [allEmployees]);

  // Use the team report filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
  } = useTeamReportV2Filters(
    uniquePositions,
    uniqueLocations,
    uniqueEmploymentTypes,
    uniqueContractTypes
  );

  // Apply client-side filtering
  const filteredEmployees = useMemo(() => {
    const selectedPositionFilters = selectedFilters.filter(f => f.startsWith('position:')).map(f => f.replace('position:', ''));
    const selectedLocationFilters = selectedFilters.filter(f => f.startsWith('location:')).map(f => f.replace('location:', ''));
    const selectedEmploymentTypeFilters = selectedFilters.filter(f => f.startsWith('employmentType:')).map(f => f.replace('employmentType:', ''));
    const selectedContractTypeFilters = selectedFilters.filter(f => f.startsWith('contractType:')).map(f => f.replace('contractType:', ''));

    const tenurePeriodOptions = ['lessThan3m', '3to6m', '6to12m', '1to3y', 'moreThan3y'];
    const selectedTenureFilter = selectedFilters.find(f => tenurePeriodOptions.includes(f));

    const exitStatusOptions = ['activeOnly', 'inactiveOnly'];
    const selectedStatusFilter = selectedFilters.find(f => exitStatusOptions.includes(f));

    return allEmployees.filter(employee => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        employee.firstName.toLowerCase().includes(searchLower) ||
        employee.lastName.toLowerCase().includes(searchLower);

      const matchesPosition = selectedPositionFilters.length === 0 || selectedPositionFilters.includes(employee.jobPosition);
      const matchesLocation = selectedLocationFilters.length === 0 || selectedLocationFilters.includes(employee.location);
      const matchesEmploymentType = selectedEmploymentTypeFilters.length === 0 || selectedEmploymentTypeFilters.includes(employee.employmentType || '');
      const matchesContractType = selectedContractTypeFilters.length === 0 || selectedContractTypeFilters.includes(employee.contractType || '');

      const isActive = !employee.exitDate;
      const matchesStatus = !selectedStatusFilter ||
        (selectedStatusFilter === 'activeOnly' && isActive) ||
        (selectedStatusFilter === 'inactiveOnly' && !isActive);

      const getTenureInMonths = (startDate?: string, exitDate?: string | null) => {
        if (!startDate) return -1;
        const start = dayjs(startDate);
        const end = exitDate ? dayjs(exitDate) : dayjs();
        return end.diff(start, 'month');
      };

      const tenureInMonths = getTenureInMonths(employee.startDate, employee.exitDate);
      const matchesTenure = !selectedTenureFilter ||
        (selectedTenureFilter === 'lessThan3m' && tenureInMonths >= 0 && tenureInMonths < 3) ||
        (selectedTenureFilter === '3to6m' && tenureInMonths >= 3 && tenureInMonths < 6) ||
        (selectedTenureFilter === '6to12m' && tenureInMonths >= 6 && tenureInMonths < 12) ||
        (selectedTenureFilter === '1to3y' && tenureInMonths >= 12 && tenureInMonths < 36) ||
        (selectedTenureFilter === 'moreThan3y' && tenureInMonths >= 36);

      return matchesSearch && matchesPosition && matchesLocation && matchesEmploymentType && matchesContractType && matchesStatus && matchesTenure;
    });
  }, [allEmployees, search, selectedFilters]);

  // Apply client-side pagination
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilters]);
  
  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  // Handle page changes
  const loadPage = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
  }, [pageSize]);
  
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
    const target = e.target as HTMLElement;
    const isOutsideTeamReportTable = !target.closest('[data-testid="team-report-table-container"]');
    
    if (isOutsideTeamReportTable && selectedEmployee) {
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
    <div>
      <PageLayout
        variant="default"
        headerIcon={<CalendarOutlined className="gba:text-blue-600 gba:text-3xl" />}
        headerLabel={'My Team'}
        contentContainer={
          <DataContainer<DataControllerProps>
            contentBackground="white"
            floatingDetails={true}
            onDetailsPanelClose={handleDetailsPanelClose}
            dataControllerComponent={DataController}
            dataControllerProps={{
              search: search,
              setSearch: setSearch,
              debounceDelay: 300,
              filter: selectedFilters,
              setFilter: () => {}, // Kept for prop compatibility, but logic is handled by add/removeFilter
              filterLabelMap: filterLabelMap,
              listIcon: <PiUsersThree size={20} />,
              listAmount: filteredEmployees.length, // Use filtered length for total
            }}
            dataFilterProps={{
              filterGroups: filterGroups,
              onFilterChange: handleFilterChange,
            }}
            dataBody={
              <div data-testid="team-report-table-container">
                <TeamReportTable
                  employees={paginatedEmployees} // Use paginated employees
                  loading={loading}
                  error={error}
                  loadPage={loadPage}
                  retry={retry}
                  total={filteredEmployees.length} // Use filtered length for total
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

export default MyTeamReportV2;
