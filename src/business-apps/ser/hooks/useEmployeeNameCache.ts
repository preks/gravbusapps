/**
 * Cache-Aware Employee Name Hook
 * Enhanced version of useEmployeeName that uses caching when available
 */

import { useState, useEffect } from 'react';
import { useEmployeeNameCacheOptional } from '../services/employee-cache';
import type { EmployeeData } from '../services/employee-cache/types';
import { env } from '@/common/env/EnvUtils';

export interface UseEmployeeNameCacheProps {
  userId: string;
  accessToken?: string;
  enabled?: boolean;
}

export interface UseEmployeeNameCacheReturn {
  employee: EmployeeData | null;
  displayName: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch individual employee name with caching support
 * Falls back to original useEmployeeName behavior if cache is not available
 */
export const useEmployeeNameCache = ({
  userId,
  accessToken,
  enabled = true,
}: UseEmployeeNameCacheProps): UseEmployeeNameCacheReturn => {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Try to get cache from context (optional)
  const cacheContext = useEmployeeNameCacheOptional();

  // Generate display name from employee data
  const displayName = employee ? (
    employee.displayName || 
    employee.fullName || 
    employee.preferredName ||
    (employee.firstName && employee.lastName ? `${employee.firstName} ${employee.lastName}` : null) ||
    employee.firstName ||
    employee.lastName ||
    'Unknown User'
  ) : null;

  // Fetch function
  const fetchEmployee = async (): Promise<void> => {
    if (!enabled || !userId || !userId.trim()) {
      setEmployee(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result: EmployeeData | null;

      if (cacheContext?.isInitialized) {
        // Use cache if available
        console.log(`[useEmployeeNameCache] Using cache to fetch employee: ${userId}`);
        result = await cacheContext.cache.get(userId);
      } else {
        // Fallback to individual GraphQL query
        console.log(`[useEmployeeNameCache] Cache not available, falling back to individual query for: ${userId}`);
        result = await fetchEmployeeIndividually(userId, accessToken);
      }

      setEmployee(result);
      console.log(`[useEmployeeNameCache] Successfully fetched employee:`, { userId, displayName: result?.displayName });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employee data';
      console.error(`[useEmployeeNameCache] Error fetching employee ${userId}:`, err);
      setError(errorMessage);
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch when dependencies change
  useEffect(() => {
    fetchEmployee();
  }, [userId, accessToken, enabled, cacheContext?.isInitialized]);

  return {
    employee,
    displayName,
    isLoading,
    error,
    refetch: fetchEmployee,
  };
};

/**
 * Fallback function to fetch employee individually when cache is not available
 * This maintains backward compatibility with the original useEmployeeName hook
 */
async function fetchEmployeeIndividually(
  userId: string, 
  accessToken?: string
): Promise<EmployeeData | null> {
  if (!accessToken) {
    throw new Error('Access token is required for individual employee query');
  }

  // Use the same GraphQL approach as the rest of the application
  let endpoint: string;
  try {
    endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'https://newwork-dev.newwork.com/v1/graphql';
  } catch (error) {
    console.warn('[useEmployeeNameCache] Could not access environment variable, using default endpoint:', error);
    endpoint = 'https://newwork-dev.newwork.com/v1/graphql';
  }
  
  const GET_EMPLOYEE_BY_USER_ID = `
    query GetEmployeeByUserId($userId: String!) {
      Employee(where: { userId: { _eq: $userId } }, limit: 1) {
        id
        userId
        firstName
        lastName
        fullName
        displayName
        preferredName
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
      query: GET_EMPLOYEE_BY_USER_ID,
      variables: { userId },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result: { data: { Employee: EmployeeData[] } } = await response.json();

  if (result.data.Employee?.length > 0) {
    return result.data.Employee[0];
  }

  return null;
}
