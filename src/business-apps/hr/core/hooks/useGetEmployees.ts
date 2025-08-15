"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

/**
 * Employee type definition for the directory.
 */
export interface Employee {
  id: string;
  userId?: string;
  supervisorEmployeeId?: string;
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
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
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
  query EmployeePositions($limit: Int!, $offset: Int!, $where: EmployeePositionBoolExp!, $orderBy: [EmployeePositionOrderBy!]) {
    EmployeePosition(
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy,
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
      supervisorEmployeeId
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
 * Helper function to build sort condition for GraphQL orderBy (matches AccountList pattern)
 */
const buildSortCondition = (sortField: string, sortOrder: "ASC" | "DESC", orderBy: any) => {
  const sortDirection = sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
  
  switch (sortField) {
    case "name":
      // For name sorting, prioritize firstName then lastName
      orderBy.firstName = sortDirection;
      break;
    case "firstName":
      orderBy.firstName = sortDirection;
      break;
    case "lastName":
      orderBy.lastName = sortDirection;
      break;
    case "jobTitle":
      orderBy.jobPosition = { name: sortDirection };
      break;
    case "organizationalUnit":
      orderBy.organizationalUnit = { name: sortDirection };
      break;
    case "employmentType":
      // Fixed: Use correct GraphQL path for employment type sorting
      orderBy.employee = { workingConditionAggregate: { max: { employmentTypeRef: sortDirection } } };
      break;
    case "contractType":
      // Fixed: Use correct GraphQL path for contract type sorting
      orderBy.employee = { workingConditionAggregate: { max: { contractTypeRef: sortDirection } } };
      break;
  }
};

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
  const { alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams, sortField, sortOrder } = filters;
  const alphaFilter = alpha ? `${alpha}%` : `%`;
  const searchFilter = search ? `%${search}%` : `%`;
  const organizationalUnitObj = organizationalUnits && organizationalUnits.length > 0 ? { organizationalUnitId: { _in: organizationalUnits } } : undefined;
  const employmentTypeObj = employmentTypes && employmentTypes.length > 0 ? { employee: { workingCondition: { employmentTypeRef: { _in: employmentTypes } } } } : undefined;
  const contractTypeObj = contractTypes && contractTypes.length > 0 ? { employee: { workingCondition: { contractTypeRef: { _in: contractTypes } } } } : undefined;
  const matrixTeamObj = matrixTeams && matrixTeams.length > 0 ? { 
    matrixUnitEmployees: { 
      matrixUnitId: { _in: matrixTeams },
      matrixUnit: { isDeleted: { _eq: false } }
    } 
  } : undefined;

  // Reset pagination state on filter change (but keep data visible)
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    // Note: We intentionally DON'T clear employees to avoid loading flicker
    // The data will be replaced when the new query completes
  }, [alpha, search, JSON.stringify(organizationalUnits), JSON.stringify(employmentTypes), JSON.stringify(contractTypes), JSON.stringify(matrixTeams), sortField, sortOrder]);

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
    
    // Only show loading for initial load (no existing data)
    if (employees.length === 0) {
      setLoading(true); // Full loading for initial load only
    }
    // For existing data: no loading indicator - seamless like pagination
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
    // Build order by condition (matches AccountList pattern)
    const orderBy: any = {};
    if (sortField && sortField.trim() !== "" && sortOrder) {
      buildSortCondition(sortField, sortOrder, orderBy);
    }
    
    client.request?.(EMPLOYEE_POSITION_QUERY, {
      limit: EMPLOYEES_PER_PAGE,
      offset,
      where,
      orderBy: Object.keys(orderBy).length > 0 
        ? [orderBy] 
        : [{ firstName: "ASC_NULLS_LAST" }]
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
            supervisorEmployeeId: ep.supervisorEmployeeId,
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
  }, [loading, hasMore, client, offset, alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams, alphaFilter, searchFilter, sortField, sortOrder]);

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
    
    // Only show loading for initial load (no existing data)
    if (employees.length === 0) {
      setLoading(true); // Full loading for initial load only
    }
    // For existing data: no loading indicator - seamless like pagination
    
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
    
    // Build order by condition (matches AccountList pattern)
    const orderBy: any = {};
    if (sortField && sortField.trim() !== "" && sortOrder) {
      buildSortCondition(sortField, sortOrder, orderBy);
    }
    
    client.request?.(EMPLOYEE_POSITION_QUERY, {
      limit: pageSize,
      offset: pageOffset,
      where,
      orderBy: Object.keys(orderBy).length > 0 
        ? [orderBy] 
        : [{ firstName: "ASC_NULLS_LAST" }]
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
            supervisorEmployeeId: ep.supervisorEmployeeId,
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
  }, [loading, client, alpha, search, organizationalUnits, employmentTypes, contractTypes, matrixTeams, alphaFilter, searchFilter, sortField, sortOrder]);

  return { employees, total, loading, error, hasMore, loadMore, loadPage, retry };
}
