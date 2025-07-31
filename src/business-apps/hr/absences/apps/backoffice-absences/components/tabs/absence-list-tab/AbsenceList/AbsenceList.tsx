import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DataContainer } from '../../../../../../../../../components/layout/dataContainer';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Card, 
  CardContent, 
  Spinner, 
  Button, 
  Badge 
} from '@newwork/nw-design-system';
import { PiCalendar, PiUser, PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { useGraphQLClient } from '../../../../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../../../../common/network/catalogs/useCatalogManagerClient';
import dayjs from 'dayjs';
import { DateRangeFilter } from './DateRangeFilter';
import { CreationDateFilter } from './CreationDateFilter';
import { EnhancedAbsence, DataFilterGroup } from '../../../../types';

const DATA_TEST_ID_PREFIX = 'BackofficeAbsenceList';

// Hardcoded statuses (these are actual status values)
const ABSENCE_STATUSES = [
  { id: 'PENDING', name: 'Pending' },
  { id: 'APPROVED', name: 'Approved' },
  { id: 'REJECTED', name: 'Rejected' },
  { id: 'CANCELLED', name: 'Cancelled' }
];

// Extended interface for AbsenceList with initial filters
interface AbsenceListProps extends BusinessAppContextProps {
  initialFilters?: {
    startDate?: string;
    endDate?: string;
    month?: string;
    status?: string;
    department?: string;
    departmentId?: string;
  };
  // 🚀 Use pre-filtered data from dashboard to ensure consistency
  preFilteredData?: Array<any>;
}

/**
 * Modern Absence List component matching manager-absences design exactly
 */
export const AbsenceList: React.FC<AbsenceListProps> = (props) => {
  const { accessToken, initialFilters, preFilteredData } = props;
  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  // State management following manager-absences pattern
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [absences, setAbsences] = useState<EnhancedAbsence[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC');
  const [selectedAbsence, setSelectedAbsence] = useState<EnhancedAbsence | null>(null);
  const [absenceGroups, setAbsenceGroups] = useState<Record<string, string>>({});
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([]);
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false);
  
  // Date range state (exactly like manager-absences)
  const [startDate, setStartDate] = useState<string | undefined>(initialFilters?.startDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialFilters?.endDate);
  const [creationStartDate, setCreationStartDate] = useState<string | undefined>(undefined);
  const [creationEndDate, setCreationEndDate] = useState<string | undefined>(undefined);
  
  const initialLoadDone = useRef(false);

  // Fetch team employees for the requester filter
  const fetchTeamEmployees = useCallback(async () => {
    if (!accessToken) return;
    
    setEmployeesLoading(true);
    try {
      // Real query to get all employees for backoffice view (wider scope than just team)
      const employeesQuery = `
        query GetEmployees {
          Employee(
            limit: 500
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
            where: { isDeleted: { _eq: false } }
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

      const result = await graphQLClient.request(employeesQuery);
      setTeamEmployees(result?.Employee || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setTeamEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, [graphQLClient, accessToken]);

  // Load team employees on mount
  useEffect(() => {
    fetchTeamEmployees();
  }, [fetchTeamEmployees]);

  // 🚀 FIX: Always fetch absence groups catalog data (regardless of preFilteredData)
  useEffect(() => {
    const fetchAbsenceGroupsCatalog = async () => {
      if (!accessToken) return;

      try {
        console.log('🔍 Fetching absence groups catalog for filters...');
        
        // Fetch catalog data for absence groups with proper auth parameters
        const catalogData = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        );
        
        const groupsMap: Record<string, string> = {};
        catalogData.data.forEach((entry: any) => {
          groupsMap[entry.id] = entry.value;
          // Map by both the main id and the catalogEntryLocalId for compatibility
          if (entry.catalogEntryLocalId) {
            groupsMap[entry.catalogEntryLocalId] = entry.value;
          }
        });
        
        setAbsenceGroups(groupsMap);
        console.log('✅ Absence groups loaded for filters:', {
          groupCount: Object.keys(groupsMap).length,
          groups: Object.values(groupsMap),
          note: 'Groups will now appear in filter options'
        });
        
      } catch (error) {
        console.error('❌ Error fetching absence groups catalog:', error);
        setAbsenceGroups({});
      }
    };

    fetchAbsenceGroupsCatalog();
  }, [accessToken, catalogClient]);

  // Fetch organizational units for department filter (only those with employees)
  const fetchOrganizationalUnits = useCallback(async () => {
    if (!accessToken) return;
    
    setOrgUnitsLoading(true);
    try {
      // Query to get organizational units from employees (same as CalendarList)
      const orgUnitsQuery = `
        query GetOrganizationalUnitsFromEmployees {
          Employee(
            where: {
              isDeleted: { _eq: false }
            }
            limit: 1000
          ) {
            employeePosition {
              organizationalUnit {
                id
                name
              }
            }
          }
        }
      `;

      const result = await graphQLClient.request(orgUnitsQuery);
      
      // Extract unique organizational units from employees
      const orgUnitsMap = new Map<string, { id: string; name: string }>();
      
      result?.Employee?.forEach((employee: any) => {
        if (employee.employeePosition?.organizationalUnit) {
          const orgUnit = employee.employeePosition.organizationalUnit;
          orgUnitsMap.set(orgUnit.id, {
            id: orgUnit.id,
            name: orgUnit.name
          });
        }
      });

      const uniqueOrgUnits = Array.from(orgUnitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      console.log('Organizational Units with employees loaded:', uniqueOrgUnits.length); // Debug
      setOrganizationalUnits(uniqueOrgUnits);
    } catch (error) {
      console.error('Error fetching organizational units:', error);
      setOrganizationalUnits([]);
    } finally {
      setOrgUnitsLoading(false);
    }
  }, [graphQLClient, accessToken]);

  // Load organizational units on mount
  useEffect(() => {
    fetchOrganizationalUnits();
  }, [fetchOrganizationalUnits]);

  // Get absence color (simplified version)
  const getColorForAbsence = (groupName: string) => {
    const colorMap: Record<string, string> = {
      'Sick Leave': '#f87171',
      'Vacation': '#10b981',
      'Special Leave': '#8b5cf6',
      'Work Leave': '#f59e0b',
    };
    return colorMap[groupName] || '#6b7280';
  };

  // Get employee display name
  const getEmployeeName = (absence: EnhancedAbsence) => {
    if (absence.employee.firstName || absence.employee.lastName) {
      return `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim();
    }
    return '-';
  };

  // Get status badge variant (matching manager-absences exactly)
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success' as const;
      case 'PENDING':
        return 'warning' as const;
      case 'REJECTED':
        return 'destructive' as const;
      case 'CANCELLED':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  // Date range handlers (exactly like manager-absences)
  const handleDateRangeChange = useCallback((start?: string, end?: string) => {
    setStartDate(start || undefined);
    setEndDate(end || undefined);
  }, []);

  const handleCreationDateRangeChange = useCallback((start?: string, end?: string) => {
    setCreationStartDate(start || undefined);
    setCreationEndDate(end || undefined);
  }, []);

  // Date range handlers for filter integration
  const handleDateRangeChangeForFilter = useCallback((startDate: string | null, endDate: string | null) => {
    handleDateRangeChange(startDate || undefined, endDate || undefined);
  }, [handleDateRangeChange]);

  const handleCreationDateRangeChangeForFilter = useCallback((startDate: string | null, endDate: string | null) => {
    handleCreationDateRangeChange(startDate || undefined, endDate || undefined);
  }, [handleCreationDateRangeChange]);

  // Build GraphQL where conditions from filters (enhanced with date and department filtering)
  const buildWhereConditions = () => {
    const conditions: any = {
      isDeleted: { _eq: false } // Ensure we don't get deleted records
    };
    
    // Add search condition
    if (search && search.trim()) {
      conditions._or = [
        { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
        { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
        { type: { value: { _ilike: `%${search.trim()}%` } } },
        { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } },
        { status: { _ilike: `%${search.trim()}%` } }
      ];
    }
    
    // Add filters
    const statusFilters = selectedFilters.filter(f => f.startsWith('status-')).map(f => f.replace('status-', ''));
    const groupFilters = selectedFilters.filter(f => f.startsWith('group-')).map(f => f.replace('group-', ''));
    const departmentFilters = selectedFilters.filter(f => f.startsWith('department-')).map(f => f.replace('department-', ''));
    const employeeFilters = selectedFilters.filter(f => !f.startsWith('status-') && !f.startsWith('group-') && !f.startsWith('department-'));
    
    if (statusFilters.length > 0) {
      conditions.status = { _in: statusFilters };
    }
    
    if (groupFilters.length > 0) {
      // Use the real parentEntryId values directly (no hardcoded mapping)
      conditions.type = { ...conditions.type, parentEntryId: { _in: groupFilters } };
    }

    if (departmentFilters.length > 0) {
      // Check if "No Department" filter is selected
      const hasNoDepartmentFilter = departmentFilters.includes('no-department');
      const regularDepartmentIds = departmentFilters.filter(f => f !== 'no-department');
      
      // Convert department IDs to names for GraphQL filter
      const regularDepartmentNames = regularDepartmentIds.map(deptId => {
        const dept = organizationalUnits.find(ou => ou.id === deptId);
        return dept?.name;
      }).filter(Boolean); // Remove undefined values

      console.log('🔧 Building department filter conditions (CALENDAR PATTERN):', {
        departmentFilters,
        hasNoDepartmentFilter,
        regularDepartmentIds,
        regularDepartmentNames,
        selectedFiltersState: selectedFilters,
        note: 'Converting IDs to names for GraphQL filter'
      });

      let departmentCondition;

      if (hasNoDepartmentFilter && regularDepartmentNames.length > 0) {
        // Both regular departments AND "No Department" selected
        departmentCondition = {
          _or: [
            { organizationalUnit: { name: { _in: regularDepartmentNames } } },
            { organizationalUnit: { _isNull: true } }
          ]
        };
        console.log('🔧 Using combined department condition (regular + no-department) - BY NAME:', departmentCondition);
      } else if (hasNoDepartmentFilter) {
        // Only "No Department" selected
        departmentCondition = { organizationalUnit: { _isNull: true } };
        console.log('🔧 Using "No Department" condition (organizationalUnit IS NULL):', departmentCondition);
      } else if (regularDepartmentNames.length > 0) {
        // Only regular departments selected - USE NAMES LIKE CALENDAR
        departmentCondition = { organizationalUnit: { name: { _in: regularDepartmentNames } } };
        console.log('🔧 Using regular department condition - BY NAME:', departmentCondition);
      }

      if (conditions.employee) {
        conditions.employee = { ...conditions.employee, employeePosition: departmentCondition };
      } else {
        conditions.employee = { employeePosition: departmentCondition };
      }
    }
    
    if (employeeFilters.length > 0) {
      if (conditions.employee) {
        conditions.employee = { ...conditions.employee, id: { _in: employeeFilters } };
      } else {
        conditions.employee = { id: { _in: employeeFilters } };
      }
    }

    // Add start/end date filters (absence date range) - OPTION 1: OVERLAP LOGIC
    // Changed to match dashboard: include any absence that overlaps with the period
    if (startDate && endDate) {
      const startDateTime = `${startDate} 00:00:00+00`;
      const endDateTime = `${endDate} 23:59:59+00`;
      conditions.startDate = { _lte: endDateTime };  // absence starts before/on period end
      conditions.endDate = { _gte: startDateTime };   // absence ends after/on period start
    } else if (startDate) {
      const startDateTime = `${startDate} 00:00:00+00`;
      conditions.endDate = { _gte: startDateTime };   // absence ends after/on start date
    } else if (endDate) {
      const endDateTime = `${endDate} 23:59:59+00`;
      conditions.startDate = { _lte: endDateTime };   // absence starts before/on end date
    }

    // Add creation date filters - exactly like manager-absences
    if (creationStartDate && creationEndDate) {
      const creationStartDateTime = `${creationStartDate} 00:00:00+00`;
      const creationEndDateTime = `${creationEndDate} 23:59:59+00`;
      conditions.createdAt = { 
        _gte: creationStartDateTime,
        _lte: creationEndDateTime
      };
    } else if (creationStartDate) {
      const creationStartDateTime = `${creationStartDate} 00:00:00+00`;
      conditions.createdAt = { _gte: creationStartDateTime };
    } else if (creationEndDate) {
      const creationEndDateTime = `${creationEndDate} 23:59:59+00`;
      conditions.createdAt = { _lte: creationEndDateTime };
    }
    
    // CRITICAL: Only include employees with active/current positions (no exitDate OR future exitDate)
    const currentDate = new Date().toISOString();
    const activePositionFilter = {
      _or: [
        { exitDate: { _isNull: true } },
        { exitDate: { _gte: currentDate } }
      ]
    };
    
    if (conditions.employee) {
      conditions.employee = { 
        ...conditions.employee, 
        employeePosition: { 
          ...conditions.employee.employeePosition,
          ...activePositionFilter
        }
      };
    } else {
      conditions.employee = { employeePosition: activePositionFilter };
    }
    
    return conditions;
  };

  // Fetch absence data
  const fetchAbsences = async () => {
    if (!accessToken) {
      console.log('No access token available for BackofficeAbsenceList');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 🚀 USE PRE-FILTERED DATA FROM DASHBOARD IF AVAILABLE
      if (preFilteredData && preFilteredData.length >= 0) {
        console.log('🚀 AbsenceList: Using pre-filtered data from dashboard', {
          count: preFilteredData.length,
          dataSource: 'Same as dashboard (ensuring consistency)',
          note: 'Will apply additional client-side filtering for status/department',
          sampleDataStructure: preFilteredData.slice(0, 2).map((item: any) => ({
            id: item.id,
            hasEmployeeName: !!item.employeeName,
            hasGroupName: !!item.groupName,
            hasCreatedAt: !!item.createdAt,
            fields: Object.keys(item || {})
          })),
          initialFilters,
          actionTaken: 'Applying client-side filtering to preFilteredData'
        });
        
        // Apply client-side filtering for status/department filters from initialFilters
        let finalData = [...preFilteredData] as EnhancedAbsence[];
        
        // Apply status filter if provided in initialFilters
        if (initialFilters?.status) {
          const beforeStatusFilter = finalData.length;
          finalData = finalData.filter((absence: any) => absence.status === initialFilters.status);
          console.log(`🎯 Applied status filter "${initialFilters.status}": ${beforeStatusFilter} → ${finalData.length} absences`);
        }
        
        // Apply department filter if provided in initialFilters  
        if (initialFilters?.department && initialFilters.department !== 'NO_DEPARTMENT_SPECIAL') {
          const beforeDeptFilter = finalData.length;
          finalData = finalData.filter((absence: any) => {
            const deptName = absence.employee?.employeePosition?.organizationalUnit?.name;
            return deptName === initialFilters.department;
          });
          console.log(`🎯 Applied department filter "${initialFilters.department}": ${beforeDeptFilter} → ${finalData.length} absences`);
        } else if (initialFilters?.department === 'NO_DEPARTMENT_SPECIAL') {
          // Handle "No Department" special case
          const beforeNoDeptFilter = finalData.length;
          finalData = finalData.filter((absence: any) => {
            const deptName = absence.employee?.employeePosition?.organizationalUnit?.name;
            return !deptName || deptName === 'No Department';
          });
          console.log(`🎯 Applied "No Department" filter: ${beforeNoDeptFilter} → ${finalData.length} absences`);
        }
        
        setAbsences(finalData);
        setTotal(finalData.length);
        setLoading(false);
        initialLoadDone.current = true; // Mark as loaded to prevent other effects
        console.log('✅ AbsenceList: State updated with filtered preFilteredData', {
          originalCount: preFilteredData.length,
          finalCount: finalData.length,
          appliedFilters: {
            status: initialFilters?.status,
            department: initialFilters?.department
          },
          loadingSet: false,
          initialLoadDoneSet: true
        });
        return;
      }
      
      // 🚀 Catalog data is now fetched in separate useEffect

      const whereConditions = buildWhereConditions();
      
      // Build order by
      const orderBy = [];
      if (sortField && sortOrder) {
        if (sortField === 'employee.firstName') {
          orderBy.push({ employee: { firstName: sortOrder } });
        } else {
          orderBy.push({ [sortField]: sortOrder });
        }
      } else {
        orderBy.push({ createdAt: 'DESC' });
      }

      // Real GraphQL query for absences (based on manager-absences pattern)
      const query = `
        query GetEmployeeAbsences($where: EmployeeAbsenceBoolExp!, $offset: Int!, $limit: Int!, $orderBy: [EmployeeAbsenceOrderBy!]) {
          EmployeeAbsence(
            where: $where
            offset: $offset
            limit: $limit
            orderBy: $orderBy
          ) {
            id
            startDate
            endDate
            effectiveDays
            calendarDays
            status
            createdAt
            employee {
              id
              firstName
              lastName
              pictureThumbnail
              employeePosition {
                organizationalUnit {
                  id
                  name
                }
              }
            }
            type {
              objectValue
              translations {
                localeCode
                value
              }
              id
              value
              parentEntryId
            }
          }
          EmployeeAbsenceAggregate(where: $where) {
            aggregate {
              count
            }
          }
        }
      `;

      const result = await graphQLClient.request<{
        EmployeeAbsence: any[];
        EmployeeAbsenceAggregate: { aggregate: { count: number } };
      }>(query, {
        where: whereConditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy: orderBy
      });

      // Transform data to match EnhancedAbsence interface
      const enhancedAbsences: EnhancedAbsence[] = result.EmployeeAbsence.map((absence: any) => {
        // employeePosition is now a single active position (filtered at query level)
        const employeeName = `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim();
        
        // Debug logging for position filtering
        if (employeeName.toLowerCase().includes('zsolt')) {
          console.log('🔍 AbsenceList Zsolt Position Debug (Query-Level Filtered):', {
            employeeName,
            employeePosition: absence.employee?.employeePosition,
            departmentName: absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department',
            departmentId: absence.employee?.employeePosition?.organizationalUnit?.id,
            note: 'Should now show only active position due to exitDate filter'
          });
        }
        
        return {
          ...absence,
          employeeName,
          groupName: absenceGroups[absence.type.parentEntryId] || absence.type.value
        };
      });

      setAbsences(enhancedAbsences);
      setTotal(result.EmployeeAbsenceAggregate.aggregate.count);

      console.log('📊 AbsenceList: GraphQL query completed', {
        totalAbsencesFound: enhancedAbsences.length,
        totalCountFromAggregate: result.EmployeeAbsenceAggregate.aggregate.count,
        appliedFilters: {
          search,
          selectedFilters,
          departmentFilters: selectedFilters.filter(f => f.startsWith('department-')),
          startDate,
          endDate
        },
        noDepartmentEmployees: enhancedAbsences.filter(a => 
          !a.employee?.employeePosition?.organizationalUnit?.name
        ).length,
        activePositionFiltering: 'Applied exitDate IS NULL filter at query level for consistent current positions',
        sampleData: enhancedAbsences.slice(0, 3).map(a => ({
          employeeName: a.employeeName,
          department: a.employee?.employeePosition?.organizationalUnit?.name || 'No Department',
          status: a.status
        }))
      });
    } catch (err) {
      console.error('BackofficeAbsenceList API call failed:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch absences'));
      setAbsences([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for preFilteredData (when drill-down data needs further filtering)
  const applyClientSideFiltering = () => {
    if (!preFilteredData) return;

    let filteredData = [...preFilteredData] as EnhancedAbsence[];

    // Apply text search
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredData = filteredData.filter((absence: any) => {
        const employeeName = absence.employeeName?.toLowerCase() || '';
        const groupName = absence.groupName?.toLowerCase() || '';
        const status = absence.status?.toLowerCase() || '';
        const departmentName = absence.employee?.employeePosition?.organizationalUnit?.name?.toLowerCase() || '';
        
        return employeeName.includes(searchTerm) ||
               groupName.includes(searchTerm) ||
               status.includes(searchTerm) ||
               departmentName.includes(searchTerm);
      });
    }

    // Apply selectedFilters
    if (selectedFilters.length > 0) {
      // Employee filters (no prefix) - Use employee.id like server-side filtering
      const employeeFilters = selectedFilters.filter(f => !f.startsWith('department-') && !f.startsWith('status-') && !f.startsWith('group-'));
      if (employeeFilters.length > 0) {
        filteredData = filteredData.filter((absence: any) => 
          employeeFilters.includes(absence.employee?.id)
        );
      }

      // Department filters
      const departmentFilters = selectedFilters.filter(f => f.startsWith('department-')).map(f => f.replace('department-', ''));
      if (departmentFilters.length > 0) {
        filteredData = filteredData.filter((absence: any) => {
          const deptId = absence.employee?.employeePosition?.organizationalUnit?.id;
          const deptName = absence.employee?.employeePosition?.organizationalUnit?.name;
          
          // Handle "No Department" special case
          if (departmentFilters.includes('no-department')) {
            return !deptName || deptName === 'No Department';
          }
          
          return departmentFilters.includes(deptId);
        });
      }

      // Status filters  
      const statusFilters = selectedFilters.filter(f => f.startsWith('status-')).map(f => f.replace('status-', ''));
      if (statusFilters.length > 0) {
        filteredData = filteredData.filter((absence: any) => 
          statusFilters.includes(absence.status)
        );
      }

      // Group filters - Use type.parentEntryId like server-side filtering  
      const groupFilters = selectedFilters.filter(f => f.startsWith('group-')).map(f => f.replace('group-', ''));
      if (groupFilters.length > 0) {
        filteredData = filteredData.filter((absence: any) => 
          groupFilters.includes(absence.type?.parentEntryId)
        );
      }
    }

    // ✅ FIX: Add creation date filtering (missing from client-side logic)
    if (creationStartDate || creationEndDate) {
      filteredData = filteredData.filter((absence: any) => {
        if (!absence.createdAt) return false; // Skip if no creation date
        
        const createdAt = new Date(absence.createdAt);
        const createdDateStr = createdAt.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        
        if (creationStartDate && creationEndDate) {
          return createdDateStr >= creationStartDate && createdDateStr <= creationEndDate;
        } else if (creationStartDate) {
          return createdDateStr >= creationStartDate;
        } else if (creationEndDate) {
          return createdDateStr <= creationEndDate;
        }
        
        return true;
      });
    }

    console.log('🔍 Client-side filtering applied:', {
      originalCount: preFilteredData.length,
      filteredCount: filteredData.length,
      appliedFilters: {
        search: search || 'none',
        selectedFilters: selectedFilters.length,
        employeeFilters: selectedFilters.filter(f => !f.includes('-')).length,
        departmentFilters: selectedFilters.filter(f => f.startsWith('department-')).length,
        statusFilters: selectedFilters.filter(f => f.startsWith('status-')).length,
        groupFilters: selectedFilters.filter(f => f.startsWith('group-')).length,
        creationDateFilter: creationStartDate || creationEndDate ? `${creationStartDate || 'any'} to ${creationEndDate || 'any'}` : 'none'
      }
    });

    setAbsences(filteredData);
    setTotal(filteredData.length);
  };

  // Effect for preFilteredData (dashboard drill-down) - process immediately
  useEffect(() => {
    console.log('🔍 AbsenceList: preFilteredData useEffect triggered', {
      hasPreFilteredData: !!preFilteredData,
      dataCount: preFilteredData?.length || 0,
      hasAccessToken: !!accessToken,
      initialLoadDone: initialLoadDone.current
    });
    
    if (preFilteredData && accessToken) {
      console.log('🚀 AbsenceList: Processing preFilteredData via useEffect', {
        dataCount: preFilteredData.length,
        initialLoadDone: initialLoadDone.current
      });
      fetchAbsences(); // This will use preFilteredData and return early
    }
  }, [preFilteredData, accessToken]);

  // Initial load effect - DON'T call fetchAbsences if preFilteredData is provided
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && !preFilteredData) {
      console.log('🔄 AbsenceList: Initial load effect triggered (no preFilteredData)');
      initialLoadDone.current = true;
      fetchAbsences();
    }
  }, [accessToken, currentPage, pageSize, preFilteredData]);

  // Search and filter effects (including date ranges like manager-absences)
  useEffect(() => {
    if (initialLoadDone.current && !preFilteredData) {
      console.log('🔍 AbsenceList: Search/filter effect triggered (no preFilteredData)', {
        search, selectedFilters, startDate, endDate
      });
      setCurrentPage(1);
      fetchAbsences();
    } else if (preFilteredData && initialLoadDone.current) {
      console.log('🔍 AbsenceList: Applying client-side filtering on preFilteredData', {
        preFilteredDataCount: preFilteredData.length,
        search, selectedFilters, startDate, endDate
      });
      setCurrentPage(1);
      applyClientSideFiltering();
    }
  }, [search, JSON.stringify(selectedFilters), pageSize, startDate, endDate, creationStartDate, creationEndDate, preFilteredData]);

  // Map department name to department ID once organizational units are loaded
  useEffect(() => {
    if (initialFilters?.department) {
      // Special handling for "No Department" case
      if (initialFilters.department === 'NO_DEPARTMENT_SPECIAL') {
        console.log('🎯 Applying "No Department" filter for drill-down', {
          initialFilters,
          action: 'Setting department-no-department filter'
        });
        setSelectedFilters(prev => {
          if (!prev.includes('department-no-department')) {
            const newFilters = [...prev, 'department-no-department'];
            console.log('🔧 "No Department" filter applied:', { 
              previousFilters: prev, 
              newFilters 
            });
            return newFilters;
          }
          return prev;
        });
        return;
      }

      // Regular department mapping (need organizational units loaded)
      if (organizationalUnits.length > 0) {
        const departmentFromName = organizationalUnits.find(
          dept => dept.name === initialFilters.department
        );
        
        if (departmentFromName) {
          const correctDepartmentFilter = `department-${departmentFromName.id}`;
          const incorrectDepartmentFilter = `department-${initialFilters.department}`;
          
          // Update selectedFilters to use department ID instead of name
          setSelectedFilters(prev => {
            const filtered = prev.filter(f => f !== incorrectDepartmentFilter);
            if (!filtered.includes(correctDepartmentFilter)) {
              filtered.push(correctDepartmentFilter);
            }
            console.log('🔧 Department filter mapped:', { 
              from: incorrectDepartmentFilter, 
              to: correctDepartmentFilter,
              departmentId: departmentFromName.id 
            });
            return filtered;
          });
        } else {
          console.warn('⚠️ Department not found in organizational units:', initialFilters.department);
        }
      }
    }
  }, [organizationalUnits, initialFilters?.department]);

  // Employee filter backend search function
  const getEmployeeFilters = useCallback((searchTerm: string) => {
    // Only show results if search term has at least 3 characters
    if (!searchTerm || searchTerm.trim().length < 3) {
      return {
        filters: [],
        loading: employeesLoading,
        error: null
      };
    }

    const filteredEmployees = teamEmployees.filter(employee => {
      const firstName = employee.firstName || '';
      const lastName = employee.lastName || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const orgUnit = (employee.employeePosition?.organizationalUnit?.name || '').toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) || orgUnit.includes(searchTerm.toLowerCase());
    });

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

  // Department filter backend search function
  const getDepartmentFilters = useCallback((searchTerm: string) => {
    // Get currently selected departments (for drill-down functionality)
    const selectedDepartmentIds = selectedFilters
      .filter(f => f.startsWith('department-'))
      .map(f => f.replace('department-', ''));
    
    const selectedDepartments = organizationalUnits.filter(department => 
      selectedDepartmentIds.includes(department.id)
    );

    // Special "No Department" filter for employees without department assignment
    const noDepartmentFilter = {
      id: 'department-no-department',
      label: 'No Department',
      selected: selectedFilters.includes('department-no-department')
    };

    // If no search term or less than 3 characters, show selected departments + "No Department" if selected
    if (!searchTerm || searchTerm.trim().length < 3) {
      const filters = selectedDepartments.map(department => ({
        id: `department-${department.id}`,
        label: department.name || 'Unknown Department',
        selected: true // These are all selected departments
      }));

      // Add "No Department" if it's selected
      if (selectedFilters.includes('department-no-department')) {
        filters.push(noDepartmentFilter);
      }

      return {
        filters,
        loading: orgUnitsLoading,
        error: null
      };
    }

    // Filter departments by search term (includes both selected and matching departments)
    const filteredDepartments = organizationalUnits.filter(department => {
        const name = department.name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });

    const filters = filteredDepartments.map(department => ({
        id: `department-${department.id}`,
        label: department.name || 'Unknown Department',
        selected: selectedFilters.includes(`department-${department.id}`)
    }));

    // Add "No Department" option if search term matches
    if ('no department'.includes(searchTerm.toLowerCase()) || 
        'unassigned'.includes(searchTerm.toLowerCase()) ||
        'none'.includes(searchTerm.toLowerCase())) {
      filters.unshift(noDepartmentFilter); // Add at beginning
    }

    return {
      filters,
      loading: orgUnitsLoading,
      error: null
    };
  }, [organizationalUnits, selectedFilters, orgUnitsLoading]);

  // Create dynamic groups from catalog data
  const dynamicGroups = Object.entries(absenceGroups).map(([id, name]) => ({
    id,
    name
  }));

  // Filter configuration matching manager-absences pattern exactly
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
      title: 'Employee (Requester)',
      backendSearch: getEmployeeFilters
    },
    {
      id: 'department',
      title: 'Department',
      backendSearch: getDepartmentFilters
    },
    {
      id: 'status',
      title: 'Status',
      filters: ABSENCE_STATUSES.map(status => ({
        id: `status-${status.id}`,
        label: status.name,
        selected: selectedFilters.includes(`status-${status.id}`)
      }))
    },
    {
      id: 'group',
      title: 'Absence Group',
      filters: dynamicGroups.map(group => ({
        id: `group-${group.id}`,
        label: group.name,
        selected: selectedFilters.includes(`group-${group.id}`)
      }))
    }
  ];

  // Only include selected employees in filter label map to avoid showing all employees
  const selectedEmployees = teamEmployees.filter(e => selectedFilters.includes(e.id));
  const selectedDepartments = organizationalUnits.filter(d => selectedFilters.includes(`department-${d.id}`));
  
  // Add "No Department" to selected departments if it's selected
  const selectedDepartmentsWithNoDepOption = [...selectedDepartments];
  if (selectedFilters.includes('department-no-department')) {
    selectedDepartmentsWithNoDepOption.push({
      id: 'no-department',
      name: 'No Department'
    } as any);
  }
  
  // Compute selectedFilters including date ranges for display (exactly like manager-absences)
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

  const filterLabelMap = {
    ...Object.fromEntries(selectedEmployees.map(e => [e.id, `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown Employee'])),
    ...Object.fromEntries(selectedDepartmentsWithNoDepOption.map(d => [`department-${d.id}`, d.name || 'Unknown Department'])),
    ...Object.fromEntries(ABSENCE_STATUSES.map(s => [`status-${s.id}`, s.name])),
    ...Object.fromEntries(dynamicGroups.map(g => [`group-${g.id}`, g.name])),
    // Date range labels (exactly like manager-absences)
    absenceDateRange: startDate && endDate ? `${startDate} - ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'Date Range',
    creationDateRange: creationStartDate && creationEndDate ? `Created ${creationStartDate} - ${creationEndDate}` : creationStartDate ? `Created from ${creationStartDate}` : creationEndDate ? `Created until ${creationEndDate}` : 'Creation Date'
  };

  // Filter handlers (enhanced for date ranges)
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Handle date range filters specially
    if (filterId === 'absenceDateRange') {
      if (!selected) {
        setStartDate(undefined);
        setEndDate(undefined);
      }
      return;
    }
    
    if (filterId === 'creationDateRange') {
      if (!selected) {
        setCreationStartDate(undefined);
        setCreationEndDate(undefined);
      }
      return;
    }
    
    if (selected) {
      setSelectedFilters(prev => [...prev, filterId]);
    } else {
      setSelectedFilters(prev => prev.filter(f => f !== filterId));
    }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    // Check if date range filters were removed
    if (!filters.includes('absenceDateRange') && (startDate || endDate)) {
      setStartDate(undefined);
      setEndDate(undefined);
    }
    
    if (!filters.includes('creationDateRange') && (creationStartDate || creationEndDate)) {
      setCreationStartDate(undefined);
      setCreationEndDate(undefined);
    }
    
    // Filter out date range filters from the regular filters
    const regularFilters = filters.filter(f => f !== 'absenceDateRange' && f !== 'creationDateRange');
    setSelectedFilters(regularFilters);
  }, [startDate, endDate, creationStartDate, creationEndDate]);

  // Table handlers
  const handleRowClick = useCallback((record: EnhancedAbsence) => {
    setSelectedAbsence(record);
  }, []);

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
  }, [pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else if (sortOrder === 'DESC') {
        setSortField('');
        setSortOrder('');
      } else {
        setSortOrder('ASC');
      }
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  // 🚀 FIX: Re-map groupName whenever absenceGroups loads to fix timing issue
  const absencesWithUpdatedGroups = useMemo(() => {
    return absences.map(absence => ({
      ...absence,
      groupName: (absence.type?.parentEntryId && absenceGroups[absence.type.parentEntryId]) || absence.type?.value || 'Unknown Group'
    }));
  }, [absences, absenceGroups]);

  // Table component matching manager-absences exactly
  const AbsenceTable = () => {
    if (error) {
      return (
        <div 
          className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
          data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
        >
          <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
            Error Loading Absences
          </div>
          <div className="gba:text-gray-600 gba:mb-4">
            {error.message}
          </div>
          <Button
            variant="default"
            onClick={fetchAbsences}
            data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
          >
            Retry
          </Button>
        </div>
      );
    }

    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardContent className="gba:p-0">
          {loading && (
            <div className="gba:flex gba:justify-center gba:p-4">
              <Spinner />
            </div>
          )}
          
          <div className="gba:overflow-x-auto">
            <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead 
                    className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('employee.firstName')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-employee-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Employee
                      {renderSortIcon('employee.firstName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('groupName')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-group-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Group
                      {renderSortIcon('groupName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('startDate')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Start Date
                      {renderSortIcon('startDate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('endDate')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      End Date
                      {renderSortIcon('endDate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('status')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Status
                      {renderSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="gba:w-[6%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('effectiveDays')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-days-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Days
                      {renderSortIcon('effectiveDays')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Created
                      {renderSortIcon('createdAt')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absencesWithUpdatedGroups.map((record) => (
                  <TableRow 
                    key={record.id}
                    className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${selectedAbsence?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                    data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                  >
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-employee-cell-${record.id}`}>
                      <div 
                        className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(record);
                        }}
                        data-testid={`${DATA_TEST_ID_PREFIX}-employee-name-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiUser size={16} className="gba:text-gray-400" />
                          <span className="gba:font-medium gba:text-sm">
                            {getEmployeeName(record)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-group-cell-${record.id}`}>
                      <Badge 
                        variant="outline"
                        style={{ 
                          backgroundColor: getColorForAbsence(record.groupName),
                          color: 'white',
                          borderColor: getColorForAbsence(record.groupName)
                        }}
                      >
                        {record.groupName}
                      </Badge>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${record.id}`}>
                      {record.startDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCalendar size={16} className="gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {dayjs(record.startDate).format('MMM DD, YYYY')}
                          </span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-end-date-cell-${record.id}`}>
                      {record.endDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCalendar size={16} className="gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {dayjs(record.endDate).format('MMM DD, YYYY')}
                          </span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}>
                      <Badge variant={getStatusBadgeVariant(record.status)}>
                        {record.status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-days-cell-${record.id}`}>
                      <span className="gba:text-sm gba:font-medium">{record.effectiveDays || '-'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${record.id}`}>
                      {record.createdAt ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCalendar size={16} className="gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {dayjs(record.createdAt).format('MMM DD, YYYY')}
                          </span>
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination matching manager-absences exactly */}
          {total > pageSize ? (
            <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
              <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
                {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} absences`}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <p className="gba:text-sm gba:font-medium">Rows per page</p>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                    className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                    data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}>
                  Page {currentPage} of {Math.ceil(total / pageSize)}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <Button
                    variant="outline"
                    className="gba:h-8 gba:w-8 gba:p-0"
                    onClick={() => handlePaginationChange(1)}
                    disabled={currentPage === 1}
                    data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                  >
                    <span className="gba:sr-only">Go to first page</span>
                    ⟨⟨
                  </Button>
                  <Button
                    variant="outline"
                    className="gba:h-8 gba:w-8 gba:p-0"
                    onClick={() => handlePaginationChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                  >
                    <span className="gba:sr-only">Go to previous page</span>
                    ⟨
                  </Button>
                  <Button
                    variant="outline"
                    className="gba:h-8 gba:w-8 gba:p-0"
                    onClick={() => handlePaginationChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                  >
                    <span className="gba:sr-only">Go to next page</span>
                    ⟩
                  </Button>
                  <Button
                    variant="outline"
                    className="gba:h-8 gba:w-8 gba:p-0"
                    onClick={() => handlePaginationChange(Math.ceil(total / pageSize))}
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                  >
                    <span className="gba:sr-only">Go to last page</span>
                    ⟩⟩
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info-single-page`}>
              <div className="gba:text-sm gba:text-muted-foreground">
                {`${total} absences`}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select-single`}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div data-testid="backoffice-absence-list-modern-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: computedSelectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Absences</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="backoffice-absence-table-container">
            <AbsenceTable />
          </div>
        }
      />
    </div>
  );
};