/**
 * Batch Employee Names Hook
 * Hook for fetching multiple employee names efficiently with caching
 */

import { useState, useEffect, useMemo } from 'react';
import { useEmployeeNameCacheOptional } from '../services/employee-cache';
import type { EmployeeData } from '../services/employee-cache/types';
import { env } from '@/common/env/EnvUtils';

export interface UseEmployeeNamesBatchProps {
  userIds: string[];
  accessToken?: string;
  enabled?: boolean;
}

export interface UseEmployeeNamesBatchReturn {
  employees: Map<string, EmployeeData | null>;
  displayNames: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to batch fetch employee names with caching support
 * Falls back to individual queries if cache is not available
 */
export const useEmployeeNamesBatch = ({
  userIds,
  accessToken,
  enabled = true,
}: UseEmployeeNamesBatchProps): UseEmployeeNamesBatchReturn => {
  const [employees, setEmployees] = useState<Map<string, EmployeeData | null>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Try to get cache from context (optional)
  const cacheContext = useEmployeeNameCacheOptional();
  
  // Deduplicate and filter valid userIds
  const validUserIds = useMemo(() => {
    return Array.from(new Set(userIds.filter(id => id && id.trim().length > 0)));
  }, [userIds]);

  // Generate display names from employee data
  const displayNames = useMemo(() => {
    const names = new Map<string, string>();
    
    for (const [userId, employee] of employees) {
      if (employee) {
        const displayName = employee.displayName || 
                           employee.fullName || 
                           employee.preferredName ||
                           (employee.firstName && employee.lastName ? `${employee.firstName} ${employee.lastName}` : null) ||
                           employee.firstName ||
                           employee.lastName ||
                           'Unknown User';
        names.set(userId, displayName);
      } else {
        names.set(userId, 'Unknown User');
      }
    }
    
    return names;
  }, [employees]);

  // Fetch function
  const fetchEmployees = async (): Promise<void> => {
    if (!enabled || validUserIds.length === 0) {
      setEmployees(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let results: Map<string, EmployeeData | null>;

      if (cacheContext?.isInitialized) {
        // Use cache if available
        console.log(`[useEmployeeNamesBatch] Using cache to fetch ${validUserIds.length} employees`);
        results = await cacheContext.cache.getBatch(validUserIds);
      } else {
        // Fallback to individual GraphQL queries
        console.log(`[useEmployeeNamesBatch] Cache not available, falling back to individual queries for ${validUserIds.length} employees`);
        results = await fetchEmployeesIndividually(validUserIds, accessToken);
      }

      setEmployees(results);
      console.log(`[useEmployeeNamesBatch] Successfully fetched ${results.size} employee records`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employee data';
      console.error('[useEmployeeNamesBatch] Error:', err);
      setError(errorMessage);
      setEmployees(new Map());
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch when dependencies change
  useEffect(() => {
    fetchEmployees();
  }, [validUserIds.join(','), accessToken, enabled, cacheContext?.isInitialized]);

  return {
    employees,
    displayNames,
    isLoading,
    error,
    refetch: fetchEmployees,
  };
};

/**
 * Fallback function to fetch employees individually when cache is not available
 * This maintains backward compatibility
 */
async function fetchEmployeesIndividually(
  userIds: string[], 
  accessToken?: string
): Promise<Map<string, EmployeeData | null>> {
  if (!accessToken) {
    throw new Error('Access token is required for individual employee queries');
  }

  // Use the same GraphQL approach as the rest of the application
  let endpoint: string;
  try {
    endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'https://newwork-dev.newwork.com/v1/graphql';
  } catch (error) {
    console.warn('[useEmployeeNamesBatch] Could not access environment variable, using default endpoint:', error);
    endpoint = 'https://newwork-dev.newwork.com/v1/graphql';
  }
  
  const GET_EMPLOYEES_BY_USER_IDS = `
    query GetEmployeesByUserIds($userIds: [String!]!) {
      Employee(where: { userId: { _in: $userIds } }) {
        id
        userId
        firstName
        lastName
        fullName
        displayName
        preferredName
        pictureThumbnail
      }
    }
  `;

  // Use fetch directly to avoid dependency issues
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: GET_EMPLOYEES_BY_USER_IDS,
      variables: { userIds },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result: { data: { Employee: EmployeeData[] } } = await response.json();

  const results = new Map<string, EmployeeData | null>();
  const foundEmployees = new Map<string, EmployeeData>();

  // Index found employees by userId
  for (const employee of result.data.Employee || []) {
    if (employee.userId) {
      foundEmployees.set(employee.userId, employee);
    }
  }

  // Set results for all requested userIds
  for (const userId of userIds) {
    const employee = foundEmployees.get(userId) || null;
    results.set(userId, employee);
  }

  return results;
}
