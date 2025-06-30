"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { DataController, DataControllerProps } from '@/components/dataController';
import { useGetEmployeesReport, Employee } from './hooks/useGetEmployeesReport';
import { calculateAverageTenure } from './utils/employeeUtils';
import { applyEmployeeFilters } from './utils/filterUtils';
import { generateKpiCards, matchesKpi as kpiMatcher } from './utils/kpiUtils';
import { useTeamReportFilters } from './hooks/useTeamReportFilters';
import { useSort } from './hooks/useSort';
import { sortData } from './utils/sortUtils';
import { TeamReportTable } from './components/TeamReportTable';
import EmployeeDetails from '@/business-apps/hr/components/employeeDetails';
import { PiUsersThree } from 'react-icons/pi';
import {
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  IdcardOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import KpiCard from './components/KpiCard';

const KpiIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'UserOutlined':
      return <UserOutlined />;
    case 'CalendarOutlined':
      return <CalendarOutlined />;
    case 'CheckOutlined':
      return <CheckOutlined />;
    case 'CloseOutlined':
      return <CloseOutlined />;
    case 'SolutionOutlined':
      return <SolutionOutlined />;
    case 'IdcardOutlined':
      return <IdcardOutlined />;
    default:
      return null;
  }
};

/**
 * My Team Report V2 page component. Renders the team member list with a table view.
 * @returns {JSX.Element}
 */
export const MyTeamReport: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken, userInfo } = props;
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
  } = useGetEmployeesReport({ accessToken: accessToken || '', userInfo });

  // Calculate average tenure using the utility function
  const averageTenureFormatted = useMemo(() => {
    return calculateAverageTenure(allEmployees).formatted;
  }, [allEmployees]);

  const kpiCards = useMemo(() => {
    return generateKpiCards(allEmployees, averageTenureFormatted);
  }, [allEmployees, averageTenureFormatted]);

  // Instantiate the sorting hook
  const { sortConfig, handleSort } = useSort();

  const {
    search,
    setSearch,
    selectedFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterGroups,
    filterLabelMap,
  } = useTeamReportFilters(
    [...new Set(allEmployees.map((e: Employee) => e.jobPosition).filter((p): p is string => !!p))],
    [...new Set(allEmployees.map((e: Employee) => e.location).filter((l): l is string => !!l))],
    [...new Set(allEmployees.map((e: Employee) => e.employmentType).filter((t): t is string => !!t))],
    [...new Set(allEmployees.map((e: Employee) => e.contractType).filter((t): t is string => !!t))]
  );

  const matchesKpi = useCallback((employee: Employee): boolean => {
    return kpiMatcher(employee, activeKpi);
  }, [activeKpi]);

  // Apply filters to the employee list using the utility function
  const filteredEmployees = useMemo(() => {
    return applyEmployeeFilters(allEmployees, search, selectedFilters, matchesKpi);
  }, [allEmployees, search, selectedFilters, matchesKpi]);

  // Apply sorting to the filtered list
  const sortedEmployees = useMemo(() => {
    return sortData(filteredEmployees, sortConfig);
  }, [filteredEmployees, sortConfig]);

  // Apply client-side pagination
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(startIndex, startIndex + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  // Reset to page 1 when filters change
  // Reset to page 1 when filters or sorting change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilters, sortConfig]);
  
  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, checked: boolean) => {
    if (checked) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
  }, [addFilter, removeFilter]);

  const displayFilters = useMemo(() => {
    const kpiFilter = kpiCards.find(kpi => kpi.key === activeKpi);
    const kpiFilterPill = kpiFilter && activeKpi !== 'all' ? [`kpi:${activeKpi}`] : [];
    return [...kpiFilterPill, ...selectedFilters];
  }, [activeKpi, selectedFilters, kpiCards]);

  const displayLabelMap = useMemo(() => {
    const kpiLabelMap = kpiCards.reduce((acc, kpi) => {
      acc[`kpi:${kpi.key}`] = kpi.label;
      return acc;
    }, {} as Record<string, string>);

    return { ...kpiLabelMap, ...filterLabelMap };
  }, [kpiCards, filterLabelMap]);

  // When a filter pill is removed, update the correct state
  const handleDisplayFilterChange = useCallback((newFilters: string[]) => {
    const kpiPillPrefix = 'kpi:';
    const newKpiFilters = newFilters.filter(f => f.startsWith(kpiPillPrefix));
    const newRegularFilters = newFilters.filter(f => !f.startsWith(kpiPillPrefix));

    // Handle KPI filter changes
    if (newKpiFilters.length === 0 && activeKpi !== 'all') {
      setActiveKpi('all'); // Reset to 'all' if the KPI pill is removed
    } else {
      const newActiveKpi = newKpiFilters[0]?.replace(kpiPillPrefix, '');
      if (newActiveKpi && newActiveKpi !== activeKpi) {
        setActiveKpi(newActiveKpi);
      }
    }

    // Handle regular filter changes
    if (newRegularFilters.length === 0 && selectedFilters.length > 0) {
      clearFilters();
    }

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
          <div className="gba:grid gba:gap-4 gba:pb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 0fr))' }}>
            {kpiCards.map(kpi => (
              <KpiCard
                {...props}
                key={kpi.key}
                kpiKey={kpi.key}
                data-testid={`team-report-kpi-${kpi.key}`}
                icon={<KpiIcon name={kpi.iconName} />}
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
                  sortConfig={sortConfig} // Pass sortConfig
                  onSort={handleSort} // Pass handleSort
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

export default MyTeamReport;
