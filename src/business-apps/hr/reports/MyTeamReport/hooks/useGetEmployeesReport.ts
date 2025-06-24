"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';

/**
 * Employee type definition for the directory.
 */
export interface Employee {
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
export type EmployeeFilters = {
  alpha?: string | null;
  search?: string;
  organizationalUnits?: string[];
  employmentTypes?: string[];
  contractTypes?: string[];
  matrixTeams?: string[];
};

const EMPLOYEES_PER_PAGE = 20;

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
export function useGetEmployeesReport({ accessToken }: { accessToken: string }) {
  const client = useGraphqlClient(accessToken);
  console.log('[useGetEmployeesReport] client:', client);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchEmployees = useCallback((page: number) => {
    if (typeof window === 'undefined') return; // Prevent SSR execution
    if (!client) {
      setError(new Error('GraphQL client unavailable'));
      setLoading(false);
      return;
    }
    setLoading(true);
    const offset = (page - 1) * EMPLOYEES_PER_PAGE;
    const variables = { limit: EMPLOYEES_PER_PAGE, offset, where: {} };
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
  }, [client]);

  useEffect(() => {
    if (accessToken && client) {
      fetchEmployees(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, client, currentPage]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  const retry = useCallback(() => {
    setError(null);
    fetchEmployees(currentPage);
  }, [fetchEmployees, currentPage]);

  return { employees, total, loading, error, currentPage, onPageChange, retry };
}

