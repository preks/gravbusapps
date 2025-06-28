"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';

/**
 * Employee type definition for the directory.
 */
export interface Employee {
  startDate?: string;
  exitDate?: string | null;
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  organizationalUnit: string;
  email: string;
  profilePicture: string;
  employmentType?: string;
  contractType?: string;
  matrixTeams?: string[];
}

/**
 * Filters for the employee directory query.
 */
export interface EmployeeFilters {
  search?: string;
  position?: string[];
  location?: string[];
  employmentType?: string[];
  contractType?: string[];
  tenurePeriod?: string;
  exitStatus?: 'active' | 'inactive' | null;
}


/**
 * Helper function to extract matrix team names from matrixUnitEmployees
 * This avoids deeply nested functions in the map operation
 */
function extractMatrixTeamNames(matrixUnitEmployees: any[] | null | undefined): string[] {
  if (!matrixUnitEmployees || !Array.isArray(matrixUnitEmployees)) {
    return [];
  }
  
  const teamNames: string[] = [];
  
  for (const employee of matrixUnitEmployees) {
    if (employee?.matrixUnit?.name) {
      teamNames.push(employee.matrixUnit.name);
    }
  }
  
  return teamNames;
}

// GraphQL query to fetch employee positions with employee and related info
const EMPLOYEE_POSITION_QUERY = `
  query EmployeePositions($limit: Int!, $offset: Int!, $where: EmployeePositionBoolExp!) {
    EmployeePosition(
      limit: $limit,
      offset: $offset,
      orderBy: [{ firstName: ASC }, { lastName: ASC }],
      where: {
        _and: [
          { jobPositionId: { _isNull: false } },
          { employeeId: { _isNull: false } },
          $where
        ]
      }
    ) {
      employeeId
      userId
      supervisor {
        id
        firstName
        lastName
      }
      firstName
      lastName
      jobPosition {
        name
      }
      organizationalUnit {
        name
      }
      matrixUnitEmployees(where: { matrixUnit: { isDeleted: { _eq: false } } }) {
        matrixUnit {
          id
          name
        }
      }
      employee {
        id
        pictureThumbnail
        workingCondition {
          contractType {
            value
          }
          employmentType {
            value
          }
          hireDate
          exitDate
        }
      }
    }
    EmployeePositionAggregate(
      where: {
        _and: [
          { jobPositionId: { _isNull: false } },
          { employeeId: { _isNull: false } },
          $where
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Custom hook to fetch employee directory data with filters and pagination.
 * @param filters Filters for the employee directory.
 * @returns Employees, total count, loading, error, hasMore, loadMore, retry
 */
export function useGetEmployeesReport({
  accessToken,
  pageSize = 20,
  filters,
  search,
}: {
  accessToken: string;
  pageSize?: number;
  filters: EmployeeFilters;
  search: string;
}) {
  const ALL_EMPLOYEES_LIMIT = 10000;
  const client = useGraphqlClient(accessToken);
  
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const buildWhereClause = useCallback(() => {
    const where: any = {};
    const andClauses = [
      { jobPositionId: { _isNull: false } },
      { employeeId: { _isNull: false } },
    ];

    if (search) {
      andClauses.push({
        _or: [
          { firstName: { _ilike: `%${search}%` } },
          { lastName: { _ilike: `%${search}%` } },
        ],
      });
    }

    if (filters.position && filters.position.length > 0) {
      andClauses.push({ jobPosition: { name: { _in: filters.position } } });
    }

    if (filters.location && filters.location.length > 0) {
      andClauses.push({ organizationalUnit: { name: { _in: filters.location } } });
    }

    if (filters.employmentType && filters.employmentType.length > 0) {
      andClauses.push({ employee: { workingCondition: { employmentType: { value: { _in: filters.employmentType } } } } });
    }

    if (filters.contractType && filters.contractType.length > 0) {
      andClauses.push({ employee: { workingCondition: { contractType: { value: { _in: filters.contractType } } } } });
    }

    if (filters.exitStatus) {
      if (filters.exitStatus === 'active') {
        andClauses.push({ employee: { workingCondition: { exitDate: { _isNull: true } } } });
      } else {
        andClauses.push({ employee: { workingCondition: { exitDate: { _isNull: false } } } });
      }
    }

    if (andClauses.length > 0) {
      where._and = andClauses;
    }

    return where;
  }, [filters, search]);

  const fetchEmployees = useCallback((page: number, whereClause: any) => {
    if (typeof window === 'undefined') return; // Prevent SSR execution
    if (!client) {
      setError(new Error('GraphQL client unavailable'));
      setLoading(false);
      return;
    }
    setLoading(true);
    const variables = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      where: whereClause,
    };
    client.request?.(EMPLOYEE_POSITION_QUERY, variables)
      .then((res: any) => {
        if (!res) {
          setError(new Error('No response from GraphQL query'));
          setLoading(false);
          return;
        }
        const employeePositions = res.EmployeePosition ?? [];
        const newEmployees = employeePositions.map((ep: any) => {
          const workingCondition = ep.employee?.workingCondition?.[0];
          return {
            id: ep.employeeId,
            userId: ep.userId,
            supervisor: ep.supervisor,
            firstName: ep.firstName,
            lastName: ep.lastName,
            jobTitle: ep.jobPosition?.name ?? '',
            organizationalUnit: ep.organizationalUnit?.name ?? '',
            email: '',
            employmentType: workingCondition?.employmentType?.value ?? '',
            contractType: workingCondition?.contractType?.value ?? '',
            matrixTeams: extractMatrixTeamNames(ep.matrixUnitEmployees),
            profilePicture: ep.employee?.pictureThumbnail ?? '',
            startDate: workingCondition?.hireDate ?? '',
            exitDate: workingCondition?.exitDate ?? ''
          };
        });
        setEmployees(newEmployees);
        setTotal(res.EmployeePositionAggregate.aggregate.count);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err);
        setLoading(false);
      });
  }, [client, pageSize]);

  useEffect(() => {
    if (accessToken && client) {
      const whereClause = buildWhereClause();
      fetchEmployees(currentPage, whereClause);
    }
  }, [accessToken, client, currentPage, pageSize, fetchEmployees, buildWhereClause]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  const retry = useCallback(() => {
    setError(null);
    const whereClause = buildWhereClause();
    fetchEmployees(currentPage, whereClause);
  }, [fetchEmployees, currentPage, buildWhereClause]);

  return { employees, total, loading, error, currentPage, onPageChange, retry };
}

