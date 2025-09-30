import { useState, useCallback } from 'react';
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

import { GET_SUPERVISOR_ABSENCES_WITH_FILTERS } from '../queries/AbsenceQueries';

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
  const {
    search,
    statuses,
    types,
    groups,
    employees,
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
  } = filters;

  const conditions: any = {};

  if (search && search.trim()) {
    conditions._or = [
      { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
      { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
      { type: { value: { _ilike: `%${search.trim()}%` } } },
      {
        employee: {
          employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } },
        },
      },
      { status: { _ilike: `%${search.trim()}%` } },
    ];
  }

  if (statuses && statuses.length > 0) {
    conditions.status = { _in: statuses };
  }

  if (types && types.length > 0) {
    conditions.type = { id: { _in: types } };
  }

  if (groups && groups.length > 0) {
    conditions.type = { ...conditions.type, parentEntryId: { _in: groups } };
  }

  if (employees && employees.length > 0) {
    if (conditions.employee) {
      conditions.employee = { ...conditions.employee, id: { _in: employees } };
    } else {
      conditions.employee = { id: { _in: employees } };
    }
  }

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

  if (creationStartDate && creationEndDate) {
    const creationStartDateTime = `${creationStartDate} 00:00:00+00`;
    const creationEndDateTime = `${creationEndDate} 23:59:59+00`;
    conditions.createdAt = {
      _gte: creationStartDateTime,
      _lte: creationEndDateTime,
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
  orgUnitId,
}: UseAbsenceListDataSimpleProps): UseAbsenceListDataSimpleReturn => {
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

  const supervisorId = orgUnitId;

  const loadAbsenceGroups = useCallback(async () => {
    try {
      const catalogData = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'AbsenceGroup',
        version: 'v1',
      });
      const typesMap: { [key: string]: string } = {};
      catalogData.data.forEach((entry: any) => {
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

  const loadPage = useCallback(
    async (targetPage: number, newPageSize: number = pageSize) => {
      if (!supervisorId) {
        setError(new Error('Supervisor ID is required'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let currentAbsenceGroups = absenceGroups;
        if (Object.keys(currentAbsenceGroups).length === 0) {
          currentAbsenceGroups = await loadAbsenceGroups();
        }

        const page = (targetPage - 1) * newPageSize;
        const whereConditions = buildWhereConditions({
          search,
          statuses,
          types,
          groups,
          employees,
          startDate,
          endDate,
          creationStartDate,
          creationEndDate,
        });

        let orderBy: any[] = [];

        if (sortField && sortOrder) {
          const graphqlSortOrder = sortOrder.toUpperCase();
          if (sortField === 'groupName') {
            orderBy.push({ startDate: 'DESC' });
          } else if (sortField === 'status') {
            orderBy.push({ status: graphqlSortOrder });
          } else if (sortField === 'effectiveDays') {
            orderBy.push({ effectiveDays: graphqlSortOrder });
          } else if (sortField === 'employee' || sortField === 'employee.firstName') {
            orderBy.push({ employee: { firstName: graphqlSortOrder } });
            orderBy.push({ employee: { lastName: graphqlSortOrder } });
          } else if (
            sortField === 'startDate' ||
            sortField === 'endDate' ||
            sortField === 'createdAt'
          ) {
            orderBy.push({ [sortField]: graphqlSortOrder });
          } else {
            orderBy.push({ [sortField]: graphqlSortOrder });
          }
        } else {
          orderBy.push({ startDate: 'DESC' });
        }

        const baseWhere = {
          isDeleted: { _eq: false },
          employee: { employeePosition: { supervisor: { id: { _eq: supervisorId } } } },
        };

        let finalWhereConditions;
        if (whereConditions.employee?.id) {
          const employeeIds = whereConditions.employee.id._in;
          const otherConditions = { ...whereConditions };
          delete otherConditions.employee;

          const employeeAndSupervisorWhere = {
            isDeleted: { _eq: false },
            employee: {
              _and: [
                { id: { _in: employeeIds } },
                { employeePosition: { supervisor: { id: { _eq: supervisorId } } } },
              ],
            },
          };

          finalWhereConditions =
            Object.keys(otherConditions).length > 0
              ? { _and: [employeeAndSupervisorWhere, otherConditions] }
              : employeeAndSupervisorWhere;
        } else {
          finalWhereConditions =
            Object.keys(whereConditions).length > 0
              ? { _and: [baseWhere, whereConditions] }
              : baseWhere;
        }

        const shouldFetchAllData = sortField === 'groupName';
        const fetchLimit = shouldFetchAllData ? 10000 : newPageSize;
        const fetchOffset = shouldFetchAllData ? 0 : page;

        const query = GET_SUPERVISOR_ABSENCES_WITH_FILTERS({
          supervisorId,
          offset: fetchOffset,
          limit: fetchLimit,
          where: finalWhereConditions,
          orderBy,
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
            offset: fetchOffset,
            limit: fetchLimit,
            where: finalWhereConditions,
            orderBy,
          });

          const rawAbsences = result.EmployeeAbsence || [];
          const totalCount = result.EmployeeAbsenceAggregate?.aggregate?.count || 0;

          let enhancedAbsences = rawAbsences.map((absence) =>
            enhanceAbsence(absence, currentAbsenceGroups),
          );

          if (sortField === 'groupName' && sortOrder) {
            enhancedAbsences = enhancedAbsences.sort((a, b) => {
              const aValue = a.groupName || '';
              const bValue = b.groupName || '';
              const groupComparison = aValue.localeCompare(bValue);
              return sortOrder === 'ASC' ? groupComparison : -groupComparison;
            });
          }

          if (shouldFetchAllData) {
            const startIndex = (targetPage - 1) * newPageSize;
            const endIndex = startIndex + newPageSize;
            const paginatedAbsences = enhancedAbsences.slice(startIndex, endIndex);

            setAbsences(paginatedAbsences);
            setTotal(enhancedAbsences.length);
            setCurrentPage(targetPage);
            setPageSize(newPageSize);
            setHasMore(endIndex < enhancedAbsences.length);
          } else {
            setAbsences(enhancedAbsences);
            setTotal(totalCount);
            setCurrentPage(targetPage);
            setPageSize(newPageSize);
            setHasMore(enhancedAbsences.length === newPageSize);
          }
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
    },
    [
      supervisorId,
      search,
      JSON.stringify(statuses),
      JSON.stringify(types),
      JSON.stringify(groups),
      JSON.stringify(employees),
      startDate,
      endDate,
      creationStartDate,
      creationEndDate,
      sortField,
      sortOrder,
      pageSize,
      graphqlClient,
      absenceGroups,
      loadAbsenceGroups,
    ],
  );

  const retry = useCallback(() => {
    loadPage(currentPage, pageSize);
  }, [loadPage, currentPage, pageSize]);

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
    retry,
  };
};
