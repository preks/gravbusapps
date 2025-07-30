import React, { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AbsenceFilters } from '../types';
import { useAbsenceCatalogs } from './useAbsenceCatalogs';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { CreationDateFilter } from '../components/CreationDateFilter';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

// DataFilter interfaces to match DataContainer expectations
export interface DataFilter {
  id: string;
  label: string;
  selected: boolean;
  count?: number;
}

export interface DataFilterGroup {
  id: string;
  title: string;
  filters?: DataFilter[];
  backendSearch?: (search: string) => { filters: DataFilter[]; loading: boolean; error: any };
  customComponent?: React.ReactElement;
  hideSearch?: boolean;
}

export interface UseAbsenceFiltersReturn {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  startDate?: string;
  endDate?: string;
  creationStartDate?: string;
  creationEndDate?: string;
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  resetFilters: () => void;
  handleDateRangeChange: (start?: string, end?: string) => void;
  handleCreationDateRangeChange: (start?: string, end?: string) => void;
  getFilters: () => AbsenceFilters;
}

// Hardcoded absence statuses based on GraphQL schema
const ABSENCE_STATUSES = [
  { id: 'PENDING', name: 'Pending' },
  { id: 'APPROVED', name: 'Approved' },
  { id: 'REJECTED', name: 'Rejected' },
  { id: 'CANCELLED', name: 'Cancelled' }
];

// Team employee interface
interface TeamEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeePosition?: {
    organizationalUnit?: {
      name: string;
    };
  };
}

export const useAbsenceFilters = (context: BusinessAppContextProps): UseAbsenceFiltersReturn => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<TeamEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [creationStartDate, setCreationStartDate] = useState<string | undefined>(undefined);
  const [creationEndDate, setCreationEndDate] = useState<string | undefined>(undefined);

  // Get catalog data (following leads pattern)
  const { absenceTypes, absenceGroups, isLoading: catalogsLoading, error: catalogsError } = useAbsenceCatalogs(context);
  
  // GraphQL client for team employees
  const graphqlClient = useGraphQLClient(context.accessToken);
  const supervisorId = context.userInfo?.employeeDetails?.employeeId;

  // Fetch team employees
  const fetchTeamEmployees = useCallback(async () => {
    if (!supervisorId) return;
    
    setEmployeesLoading(true);
    try {
      const directReportsQuery = `
        query GetDirectReports($supervisorId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisor: { id: { _eq: $supervisorId } } }
            }
            limit: 100
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
          ) {
            id
            firstName
            lastName
            employeePosition {
              organizationalUnit {
                name
              }
            }
          }
        }
      `;

      const result = await graphqlClient.request(directReportsQuery, { supervisorId });
      setTeamEmployees(result?.Employee || []);
    } catch (error) {
      console.error('Error fetching team employees:', error);
    } finally {
      setEmployeesLoading(false);
    }
  }, [graphqlClient, supervisorId]);

  // Load team employees on mount
  React.useEffect(() => {
    fetchTeamEmployees();
  }, [fetchTeamEmployees]);

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedFilters([]);
    // Clear all date ranges
    setStartDate(undefined);
    setEndDate(undefined);
    setCreationStartDate(undefined);
    setCreationEndDate(undefined);
  }, []);

  const handleDateRangeChange = useCallback((start?: string, end?: string) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleCreationDateRangeChange = useCallback((start?: string, end?: string) => {
    setCreationStartDate(start);
    setCreationEndDate(end);
  }, []);

  // Wrapper for DateRangeFilter component
  const handleDateRangeChangeForFilter = useCallback((start: string | null, end: string | null) => {
    setStartDate(start || undefined);
    setEndDate(end || undefined);
  }, []);

  // Wrapper for CreationDateFilter component
  const handleCreationDateRangeChangeForFilter = useCallback((start: string | null, end: string | null) => {
    setCreationStartDate(start || undefined);
    setCreationEndDate(end || undefined);
  }, []);

  // Backend search functions (following leads pattern exactly)
    const getStatusFilters = useCallback((search: string) => {
    const filteredStatuses = search 
      ? ABSENCE_STATUSES.filter(status =>
          status.name.toLowerCase().includes(search.toLowerCase())
        )
      : ABSENCE_STATUSES;

    return {
      filters: filteredStatuses.map(status => ({
        id: status.id,
        label: status.name,
        selected: selectedFilters.includes(status.id)
      })),
      loading: false,
      error: null
    };
  }, [selectedFilters]);

  const getTypeFilters = useCallback((search: string) => {
    const filteredTypes = search 
      ? absenceTypes.filter(type => 
          type.name.toLowerCase().includes(search.toLowerCase())
        )
      : absenceTypes;

    return {
      filters: filteredTypes.map(type => ({
        id: type.id,
        label: type.name,
        selected: selectedFilters.includes(type.id)
      })),
      loading: catalogsLoading,
      error: catalogsError
    };
  }, [absenceTypes, selectedFilters, catalogsLoading, catalogsError]);

  const getGroupFilters = useCallback((search: string) => {
    const filteredGroups = search 
      ? absenceGroups.filter(group => 
          group.name.toLowerCase().includes(search.toLowerCase())
        )
      : absenceGroups;

    return {
      filters: filteredGroups.map(group => ({
        id: group.id,
        label: group.name,
        selected: selectedFilters.includes(group.id)
      })),
      loading: catalogsLoading,
      error: catalogsError
    };
  }, [absenceGroups, selectedFilters, catalogsLoading, catalogsError]);

  const getEmployeeFilters = useCallback((search: string) => {
    const filteredEmployees = search 
      ? teamEmployees.filter(employee => {
          const firstName = employee.firstName || '';
          const lastName = employee.lastName || '';
          const fullName = `${firstName} ${lastName}`.toLowerCase();
          const orgUnit = (employee.employeePosition?.organizationalUnit?.name || '').toLowerCase();
          return fullName.includes(search.toLowerCase()) || orgUnit.includes(search.toLowerCase());
        })
      : teamEmployees;

    return {
      filters: filteredEmployees.map(employee => ({
        id: employee.id,
        label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
        selected: selectedFilters.includes(employee.id)
      })),
      loading: employeesLoading,
      error: null
    };
  }, [teamEmployees, selectedFilters, employeesLoading]);

  // Convert catalog options to filter options for static display (following leads pattern exactly)
  const statusFilterOptions: DataFilter[] = ABSENCE_STATUSES.map((status) => ({
    id: status.id,
    label: status.name,
    selected: selectedFilters.includes(status.id)
    }));

  const typeFilterOptions: DataFilter[] = absenceTypes.map((type) => ({
    id: type.id,
    label: type.name,
    selected: selectedFilters.includes(type.id)
    }));

  const groupFilterOptions: DataFilter[] = absenceGroups.map((group) => ({
    id: group.id,
    label: group.name,
    selected: selectedFilters.includes(group.id)
    }));

  const employeeFilterOptions: DataFilter[] = teamEmployees.map((employee) => ({
    id: employee.id,
    label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
    selected: selectedFilters.includes(employee.id)
    }));

  // Create filter groups with backend search functions (following leads pattern exactly)
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'absenceDateRange',
      title: 'Start - End Date',
      customComponent: React.createElement(DateRangeFilter, {
        key: `absenceDateRange-${startDate}-${endDate}`, // Force re-render when dates change
        initialStartDate: startDate,
        initialEndDate: endDate,
        onDateRangeChange: handleDateRangeChangeForFilter
      }),
      hideSearch: true
    } as any, // Temporary type assertion to bypass interface issue
    {
      id: 'creationDateRange',
      title: 'Creation Date',
      customComponent: React.createElement(CreationDateFilter, {
        key: `creationDateRange-${creationStartDate}-${creationEndDate}`, // Force re-render when dates change
        initialStartDate: creationStartDate,
        initialEndDate: creationEndDate,
        onCreationDateRangeChange: handleCreationDateRangeChangeForFilter
      }),
      hideSearch: true
    } as any, // Temporary type assertion to bypass interface issue
    {
      id: 'employee',
      title: 'Employee',
      filters: employeeFilterOptions,
      backendSearch: getEmployeeFilters
    },
    {
      id: 'status',
      title: 'Status',
      filters: statusFilterOptions,
      backendSearch: getStatusFilters
    },
    {
      id: 'type',
      title: 'Type',
      filters: typeFilterOptions,
      backendSearch: getTypeFilters
    },
    {
      id: 'group',
      title: 'Group',
      filters: groupFilterOptions,
      backendSearch: getGroupFilters
    }
  ];

  // Create filter label map (following leads pattern exactly)
  const filterLabelMap = {
    ...Object.fromEntries(ABSENCE_STATUSES.map(status => [status.id, status.name])),
    ...Object.fromEntries(absenceTypes.map(type => [type.id, type.name])),
    ...Object.fromEntries(absenceGroups.map(group => [group.id, group.name])),
    ...Object.fromEntries(teamEmployees.map(employee => {
      const firstName = employee.firstName || '';
      const lastName = employee.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return [employee.id, fullName || 'Unknown Employee'];
    })),
    // Add date range labels
    ...(startDate && endDate ? { 'absenceDateRange': `Start - End Date: ${startDate} to ${endDate}` } : {}),
    ...(startDate && !endDate ? { 'absenceDateRange': `Start - End Date: From ${startDate}` } : {}),
    ...(!startDate && endDate ? { 'absenceDateRange': `Start - End Date: Until ${endDate}` } : {}),
    ...(creationStartDate && creationEndDate ? { 'creationDateRange': `Creation Date: ${creationStartDate} to ${creationEndDate}` } : {}),
    ...(creationStartDate && !creationEndDate ? { 'creationDateRange': `Creation Date: From ${creationStartDate}` } : {}),
    ...(!creationStartDate && creationEndDate ? { 'creationDateRange': `Creation Date: Until ${creationEndDate}` } : {})
  };

  // Get current filters for API calls
  const getFilters = useCallback((): AbsenceFilters => {
    const statuses = selectedFilters.filter(f => ABSENCE_STATUSES.map(s => s.id).includes(f));
    const types = selectedFilters.filter(f => absenceTypes.map(t => t.id).includes(f));
    const groups = selectedFilters.filter(f => absenceGroups.map(g => g.id).includes(f));
    const employees = selectedFilters.filter(f => teamEmployees.map(e => e.id).includes(f));

    const filters = {
      search,
      statuses,
      types,
      groups,
      employees,
      startDate,
      endDate,
      creationStartDate,
      creationEndDate
    };

  
    return filters;
  }, [search, selectedFilters, absenceTypes, absenceGroups, teamEmployees, startDate, endDate, creationStartDate, creationEndDate]);

  // Compute selectedFilters including date ranges for display
  const computedSelectedFilters = useMemo(() => {
    const allSelectedFilters = [...selectedFilters];
    
    // Add absence date range filter if active
    if (startDate || endDate) {
      if (!allSelectedFilters.includes('absenceDateRange')) {
        allSelectedFilters.push('absenceDateRange');
      }
    } else {
      // Remove if no longer active
      const index = allSelectedFilters.indexOf('absenceDateRange');
      if (index > -1) {
        allSelectedFilters.splice(index, 1);
      }
    }
    
    // Add creation date range filter if active
    if (creationStartDate || creationEndDate) {
      if (!allSelectedFilters.includes('creationDateRange')) {
        allSelectedFilters.push('creationDateRange');
      }
    } else {
      // Remove if no longer active
      const index = allSelectedFilters.indexOf('creationDateRange');
      if (index > -1) {
        allSelectedFilters.splice(index, 1);
      }
    }
    
    return allSelectedFilters;
  }, [selectedFilters, startDate, endDate, creationStartDate, creationEndDate]);

  return {
    search,
    setSearch,
    selectedFilters: computedSelectedFilters,
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    handleDateRangeChange,
    handleCreationDateRangeChange,
    getFilters
  };
}; 