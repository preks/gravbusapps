import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { AbsenceFilters, EmployeeAbsence, EnhancedAbsence } from '../types';
import { enhanceAbsence } from '../utils';

interface UseAbsenceListDataSimpleProps extends AbsenceFilters {
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  accessToken: string;
  orgUnitId?: string;
}

interface UseAbsenceListDataSimpleReturn {
  absences: EnhancedAbsence[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => Promise<void>;
  retry: () => void;
}

// Use the existing query structure from AbsenceQueries.ts
import { GET_SUPERVISOR_ABSENCES_WITH_FILTERS } from '../queries/AbsenceQueries';

// Function to build where conditions for filtering
const buildWhereConditions = (filters: {
  search?: string;
  statuses?: string[];
  types?: string[];
  groups?: string[];
  employees?: string[];
  startDate?: string;
  endDate?: string;
  creationStartDate?: string;
  creationEndDate?: string;
}) => {
  const { search, statuses, types, groups, employees, startDate, endDate, creationStartDate, creationEndDate } = filters;
  

  
  const conditions: any = {};
  
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
  
  // Add status filter
  if (statuses && statuses.length > 0) {
    conditions.status = { _in: statuses };
  }
  
  // Add type filter
  if (types && types.length > 0) {
    conditions.type = { id: { _in: types } };
  }
  
  // Add group filter
  if (groups && groups.length > 0) {
    conditions.type = { ...conditions.type, parentEntryId: { _in: groups } };
  }
  
  // Add employee filter
  if (employees && employees.length > 0) {
    // Ensure we don't overwrite existing employee conditions
    if (conditions.employee) {
      conditions.employee = { ...conditions.employee, id: { _in: employees } };
    } else {
      conditions.employee = { id: { _in: employees } };
    }
  }
  
  // Add start/end date filters (absence date range)
  if (startDate && endDate) {
    const startDateTime = `${startDate} 00:00:00+00`;
    const endDateTime = `${endDate} 23:59:59+00`;
    conditions.startDate = { _gte: startDateTime };
    conditions.endDate = { _lte: endDateTime };
    
  } else if (startDate) {
    const startDateTime = `${startDate} 00:00:00+00`;
    conditions.startDate = { _gte: startDateTime };
    
  } else if (endDate) {
    const endDateTime = `${endDate} 23:59:59+00`;
    conditions.endDate = { _lte: endDateTime };
    
  }

  // Add creation date filters
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
  

  return conditions;
};

export const useAbsenceListDataSimple = ({
  search = '',
  statuses = [],
  types = [],
  groups = [],
  employees = [],
  startDate,
  endDate,
  creationStartDate,
  creationEndDate,
  sortField = 'startDate',
  sortOrder = 'DESC',
  accessToken,
  orgUnitId
}: UseAbsenceListDataSimpleProps): UseAbsenceListDataSimpleReturn => {
  

  // Debug logging removed - issue resolved
  
  const [absences, setAbsences] = useState<EnhancedAbsence[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [absenceGroups, setAbsenceGroups] = useState<{ [key: string]: string }>({});

  const graphqlClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);
  
  // Use supervisorId instead of orgUnitId for manager absences
  const supervisorId = orgUnitId; // This will be passed as employeeId from the component

  // Load absence groups for data enhancement
  const loadAbsenceGroups = useCallback(async () => {
    try {
      const catalogData = await catalogClient.getCatalogEntriesList({ 
        catalogIdentifier: 'AbsenceGroup', 
        version: 'v1' 
      });
      const typesMap: { [key: string]: string } = {};
      catalogData.data.forEach((entry: any) => {
        // Map by both the main id and the catalogEntryLocalId
        typesMap[entry.id] = entry.value;
        if (entry.catalogEntryLocalId) {
          typesMap[entry.catalogEntryLocalId] = entry.value;
        }
      });

      setAbsenceGroups(typesMap);
      return typesMap;
    } catch (err) {
      console.error('Error loading absence groups:', err);
      return {};
    }
  }, [catalogClient]);

  // Load page of absences data
  const loadPage = useCallback(async (
    targetPage: number, 
    newPageSize: number = pageSize
  ) => {

    if (!supervisorId) {
      setError(new Error('Supervisor ID is required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load absence groups if not already loaded
      let currentAbsenceGroups = absenceGroups;
      if (Object.keys(currentAbsenceGroups).length === 0) {
        currentAbsenceGroups = await loadAbsenceGroups();
      }

      const page = (targetPage - 1) * newPageSize;
      


      // Build where conditions for filtering
      const whereConditions = buildWhereConditions({
        search,
        statuses,
        types,
        groups,
        employees,
        startDate,
        endDate,
        creationStartDate,
        creationEndDate
      });

      // Build order by conditions
      const orderBy = sortField ? [{ [sortField]: sortOrder }] : [{ startDate: 'DESC' }];

      // Build base where conditions for supervisor
      const baseWhere = { 
        isDeleted: { _eq: false },
        employee: { employeePosition: { supervisor: { id: { _eq: supervisorId } } } }
      };

      // Handle employee filter specially - combine supervisor + employee constraints
      let finalWhereConditions;
      if (whereConditions.employee?.id) {
        // Employee filter exists - combine supervisor constraint with employee filter
        const employeeIds = whereConditions.employee.id._in;
        const otherConditions = { ...whereConditions };
        delete otherConditions.employee; // Remove employee from other conditions
        
        // Combine supervisor and employee constraints
        const employeeAndSupervisorWhere = {
          isDeleted: { _eq: false },
          employee: { 
            _and: [
              { id: { _in: employeeIds } }, // Employee filter
              { employeePosition: { supervisor: { id: { _eq: supervisorId } } } } // Supervisor constraint
            ]
          }
        };
        
        finalWhereConditions = Object.keys(otherConditions).length > 0 
          ? { _and: [employeeAndSupervisorWhere, otherConditions] }
          : employeeAndSupervisorWhere;
      } else {
        // No employee filter - use normal logic
        finalWhereConditions = Object.keys(whereConditions).length > 0 
          ? { _and: [baseWhere, whereConditions] }
          : baseWhere;
      }



      // Use the supervisor query structure
      const query = GET_SUPERVISOR_ABSENCES_WITH_FILTERS({
        supervisorId,
        offset: page,
        limit: newPageSize,
        where: finalWhereConditions,
        orderBy
      });



      try {
        const result = await graphqlClient.request<{
          EmployeeAbsence: EmployeeAbsence[];
          EmployeeAbsenceAggregate: {
            aggregate: {
              count: number;
            };
          };
        }>(query, {
          offset: page,
          limit: newPageSize,
          where: finalWhereConditions,
          orderBy
        });
        
        const rawAbsences = result.EmployeeAbsence || [];
        const totalCount = result.EmployeeAbsenceAggregate?.aggregate?.count || 0;
        

        
        // Server-side filtering is now handled in the GraphQL query
        // Just enhance the absences data
        const enhancedAbsences = rawAbsences.map(absence => 
          enhanceAbsence(absence, currentAbsenceGroups)
        );
        
        setAbsences(enhancedAbsences);
        setTotal(totalCount);
        setCurrentPage(targetPage);
        setPageSize(newPageSize);
        setHasMore(enhancedAbsences.length === newPageSize);
        
      } catch (error) {
        console.error('Error fetching absences:', error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      }

    } catch (err) {
      console.error('Error fetching absences:', err);
      setError(err instanceof Error ? err : new Error('Failed to load absences'));
      setAbsences([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [supervisorId, search, JSON.stringify(statuses), JSON.stringify(types), JSON.stringify(groups), JSON.stringify(employees), startDate, endDate, creationStartDate, creationEndDate, sortField, sortOrder, pageSize, graphqlClient, absenceGroups, loadAbsenceGroups]);

  // Retry function
  const retry = useCallback(() => {
    loadPage(currentPage, pageSize);
  }, [loadPage, currentPage, pageSize]);

  // Load more function (for potential infinite scroll)
  const loadMore = useCallback(() => {
    loadPage(currentPage + 1, pageSize);
  }, [loadPage, currentPage, pageSize]);

  return {
    absences,
    total,
    loading,
    error,
    hasMore,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    loadMore,
    loadPage,
    retry
  };
}; 