"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

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
 * @returns Employees, total count, loading, error, hasMore, loadMore, loadPage, retry
 */
export function useGetEmployees(filters: EmployeeFilters & { accessToken: string }) {
  const client = useGraphqlClient(filters.accessToken);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams } = filters;
  const alphaFilter = alpha ? `${alpha}%` : `%`;
  const searchFilter = search ? `%${search}%` : `%`;
  const organizationalUnitObj = organizationalUnits && organizationalUnits.length > 0 ? { organizationalUnitId: { _in: organizationalUnits } } : undefined;
  const employmentTypeObj = employmentTypes && employmentTypes.length > 0 ? { employee: { workingCondition: { employmentType: { value: { _in: employmentTypes } } } } } : undefined;
  const contractTypeObj = contractTypes && contractTypes.length > 0 ? { employee: { workingCondition: { contractType: { value: { _in: contractTypes } } } } } : undefined;
  const matrixTeamObj = matrixTeams && matrixTeams.length > 0 ? { 
    matrixUnitEmployees: { 
      matrixUnitId: { _in: matrixTeams },
      matrixUnit: { isDeleted: { _eq: false } }
    } 
  } : undefined;

  // Reset on filter change
  useEffect(() => {
    setEmployees([]);
    setOffset(0);
    setHasMore(true);
  }, [alpha, search, JSON.stringify(organizationalUnits), JSON.stringify(employmentTypes), JSON.stringify(contractTypes), JSON.stringify(matrixTeams)]);

  /**
   * Loads more employees from the API. Guards against undefined client and SSR.
   */
  const loadMore = useCallback(() => {
    if (typeof window === 'undefined') return; // Prevent SSR execution
    if (!client) {
      setError(new Error('GraphQL client unavailable'));
      setLoading(false);
      return;
    }
    if (loading || !hasMore) return;
    setLoading(true);
    // Dynamically build the where filter
    const where = {
      ...(alpha ? { lastName: { _ilike: alphaFilter } } : {}),
      ...(search ? {
        _or: [
          { firstName: { _ilike: searchFilter } },
          { lastName: { _ilike: searchFilter } }
        ]
      } : {}),
      ...organizationalUnitObj,
      ...employmentTypeObj,
      ...contractTypeObj,
      ...matrixTeamObj
    };
    client.request?.(EMPLOYEE_POSITION_QUERY, {
      limit: EMPLOYEES_PER_PAGE,
      offset,
      where
    })
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
            email: '', // Email not provided in query, default empty
            employmentType: workingCondition?.employmentType?.value ?? '',
            contractType: workingCondition?.contractType?.value ?? '',
            // Extract matrix team names and avoid deeply nested functions
            matrixTeams: extractMatrixTeamNames(ep.matrixUnitEmployees),
            profilePicture: ep.employee?.pictureThumbnail ?? '',
          };
        });
        setEmployees((prev: Employee[]) => [...prev, ...newEmployees]);
        setTotal(res.EmployeePositionAggregate.aggregate.count);
        setOffset(prev => prev + EMPLOYEES_PER_PAGE);
        setHasMore(newEmployees.length === EMPLOYEES_PER_PAGE);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err);
        setHasMore(false);
        setLoading(false);
      });
  }, [loading, hasMore, client, offset, alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams, alphaFilter, searchFilter]);

  const retry = useCallback(() => {
    setError(null);
    setHasMore(true);
    loadMore();
  }, [loadMore]);

  /**
   * Loads a specific page of employees. Used for true pagination.
   * @param page Page number (1-based)
   * @param pageSize Number of employees per page
   */
  const loadPage = useCallback((page: number, pageSize: number = EMPLOYEES_PER_PAGE) => {
    if (typeof window === 'undefined') return; // Prevent SSR execution
    if (!client) {
      setError(new Error('GraphQL client unavailable'));
      setLoading(false);
      return;
    }
    if (loading) return;
    
    const pageOffset = (page - 1) * pageSize;
    setLoading(true);
    
    // Dynamically build the where filter
    const where = {
      ...(alpha ? { lastName: { _ilike: alphaFilter } } : {}),
      ...(search ? {
        _or: [
          { firstName: { _ilike: searchFilter } },
          { lastName: { _ilike: searchFilter } }
        ]
      } : {}),
      ...organizationalUnitObj,
      ...employmentTypeObj,
      ...contractTypeObj,
      ...matrixTeamObj
    };
    
    client.request?.(EMPLOYEE_POSITION_QUERY, {
      limit: pageSize,
      offset: pageOffset,
      where
    })
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
            email: '', // Email not provided in query, default empty
            employmentType: workingCondition?.employmentType?.value ?? '',
            contractType: workingCondition?.contractType?.value ?? '',
            // Extract matrix team names and avoid deeply nested functions
            matrixTeams: extractMatrixTeamNames(ep.matrixUnitEmployees),
            profilePicture: ep.employee?.pictureThumbnail ?? '',
          };
        });
        
        // For pagination, replace the employees array with just the current page
        setEmployees(newEmployees);
        setTotal(res.EmployeePositionAggregate.aggregate.count);
        setOffset(pageOffset);
        setHasMore(newEmployees.length === pageSize);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err);
        setHasMore(false);
        setLoading(false);
      });
  }, [loading, client, alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams, alphaFilter, searchFilter]);

  return { employees, total, loading, error, hasMore, loadMore, loadPage, retry };
}
