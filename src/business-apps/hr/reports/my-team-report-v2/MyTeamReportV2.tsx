"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DataController, DataControllerProps } from '@/components/dataController';
import { useGetEmployeesReport, Employee } from './hooks/useGetEmployeesReport';
import { calculateAverageTenure } from './utils/employeeUtils';
import { applyEmployeeFilters } from './utils/filterUtils';
import { useTeamReportV2Filters } from './hooks/useTeamReportV2Filters';
import { TeamReportTable } from './components/TeamReportTable';
import EmployeeDetails from '@/business-apps/hr/components/employeeDetails';
import { PiUsersThree } from 'react-icons/pi';
import { CalendarOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import KpiCard from './components/KpiCard';

/**
 * My Team Report V2 page component. Renders the team member list with a table view.
 * @returns {JSX.Element}
 */
export const MyTeamReportV2: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props;
  const { t } = useTranslation();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeKpi, setActiveKpi] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch all employees. Filtering and pagination will be done on the client side.
  const {
    employees: allEmployees,
    loading,
    error,
    retry,
  } = useGetEmployeesReport({ accessToken: accessToken || '' });

  // Calculate average tenure using the utility function
  const averageTenureFormatted = useMemo(() => {
    return calculateAverageTenure(allEmployees).formatted;
  }, [allEmployees]);

  const {
    search,
    setSearch,
    selectedFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterGroups,
    filterLabelMap,
  } = useTeamReportV2Filters(
    [...new Set(allEmployees.map((e: Employee) => e.jobPosition).filter((p): p is string => !!p))],
    [...new Set(allEmployees.map((e: Employee) => e.location).filter((l): l is string => !!l))],
    [...new Set(allEmployees.map((e: Employee) => e.employmentType).filter((t): t is string => !!t))],
    [...new Set(allEmployees.map((e: Employee) => e.contractType).filter((t): t is string => !!t))]
  );

  const matchesKpi = useCallback((employee: Employee): boolean => {
    if (activeKpi === 'all') return true;
    if (activeKpi === 'tenure') return !!employee.startDate;
    if (activeKpi === 'active') return !employee.exitDate;
    if (activeKpi === 'inactive') return !!employee.exitDate;
    if (activeKpi === 'internal') return employee.employmentType === 'Internal';
    if (activeKpi === 'external') return employee.employmentType === 'External';
    if (activeKpi === 'fulltime') return !!employee.contractType?.toLowerCase().includes('full time');
    if (activeKpi === 'parttime') return !!employee.contractType?.toLowerCase().includes('part time');
    return true;
  }, [activeKpi]);

  // Apply filters to the employee list using the utility function
  const filteredEmployees = useMemo(() => {
    return applyEmployeeFilters(allEmployees, search, selectedFilters, matchesKpi);
  }, [allEmployees, search, selectedFilters, matchesKpi]);

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
  const handleFilterChange = useCallback((filterId: string, checked: boolean) => {
    if (checked) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
  }, [addFilter, removeFilter]);

  const kpiCards = useMemo(() => [
    { key: 'all', label: 'All', subLabel: 'Employees', value: allEmployees.length, color: '#1890ff' },
    // { key: 'active', label: 'Active', subLabel: 'Employees', value: allEmployees.filter(e => !e.exitDate).length, color: '#52c41a' },
    // { key: 'inactive', label: 'Inactive', subLabel: 'Employees', value: allEmployees.filter(e => e.exitDate).length, color: '#f5222d' },
    { key: 'internal', label: 'Internal', subLabel: 'Workers', value: allEmployees.filter(e => e.employmentType === 'Internal').length, color: '#faad14' },
    { key: 'external', label: 'External', subLabel: 'Workers', value: allEmployees.filter(e => e.employmentType === 'External').length, color: '#13c2c2' },
    { key: 'fulltime', label: 'Full-time', subLabel: 'Full-time', value: allEmployees.filter(e => e.contractType?.toLowerCase().includes('full time')).length, color: '#722ed1' },
    { key: 'tenure', label: 'Avg. Tenure', subLabel: 'Years & Months', value: averageTenureFormatted, color: '#fa8c16' },
  ], [allEmployees, averageTenureFormatted]);

  const displayFilters = useMemo(() => {
    return [...selectedFilters, ...(activeKpi !== 'all' ? [activeKpi] : [])];
  }, [selectedFilters, activeKpi]);

  const kpiLabelMap = useMemo(() => {
    return kpiCards.reduce((acc, kpi) => {
      acc[kpi.key] = kpi.label;
      return acc;
    }, {} as Record<string, string>);
  }, [kpiCards]);

  const displayLabelMap = useMemo(() => ({
    ...filterLabelMap,
    ...kpiLabelMap,
  }), [filterLabelMap, kpiLabelMap]);

  const handleDisplayFilterChange = useCallback((newDisplayFilters: string[]) => {
    const kpiKeys = kpiCards.map(kpi => kpi.key);

    if (newDisplayFilters.length === 0) {
      clearFilters();
      setActiveKpi('all');
      return;
    }

    if (activeKpi !== 'all' && !newDisplayFilters.includes(activeKpi)) {
      setActiveKpi('all');
    }

    const newRegularFilters = newDisplayFilters.filter(f => !kpiKeys.includes(f));
    const removedRegularFilters = selectedFilters.filter(f => !newRegularFilters.includes(f));
    
    removedRegularFilters.forEach(filterToRemove => {
      removeFilter(filterToRemove);
    });
  }, [activeKpi, selectedFilters, clearFilters, removeFilter, kpiCards]);

  // Handle page changes
  const loadPage = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  }, []);

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
        contentHeader={
          <div className="gba:grid gba:gap-4 gba:pb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {kpiCards.map(kpi => (
              <KpiCard
                key={kpi.key}
                accessToken={accessToken}
                icon={<PiUsersThree />}
                label={kpi.label}
                subLabel={kpi.subLabel}
                value={kpi.value}
                accentColor={kpi.color}
                active={activeKpi === kpi.key}
                onClick={() => setActiveKpi(kpi.key)}
              />
            ))}
          </div>
        }
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
              filter: displayFilters,
              setFilter: handleDisplayFilterChange,
              filterLabelMap: displayLabelMap,
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
