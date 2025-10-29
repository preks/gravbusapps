/**
 * Hook to batch fetch employee avatars for multiple users
 * More efficient than individual queries - fetches all employees in one request
 */

import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface EmployeeAvatarData {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  pictureThumbnail?: string;
}

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(
      where: { 
        userId: { _in: $userIds }
        isDeleted: { _eq: false }
      }
    ) {
      id
      userId
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
`;

export const useEmployeeAvatarsBatch = (accessToken: string, userIds: string[]) => {
  const [employeeMap, setEmployeeMap] = useState<Map<string, EmployeeAvatarData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchEmployees = useCallback(
    async (ids: string[]) => {
      if (!ids.length || !accessToken) {
        setEmployeeMap(new Map());
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const uniqueIds = [...new Set(ids)]; // Remove duplicates
        console.log('[useEmployeeAvatarsBatch] Fetching employees for userIds:', uniqueIds);

        const result = await graphqlClient.request<{
          Employee: EmployeeAvatarData[];
        }>(GET_EMPLOYEES_BY_USER_IDS, {
          userIds: uniqueIds
        });

        const employees = result?.Employee || [];
        console.log('[useEmployeeAvatarsBatch] Fetched employees:', employees.length);

        // Create map of userId -> employee data
        const map = new Map<string, EmployeeAvatarData>();
        employees.forEach(employee => {
          if (employee.userId) {
            map.set(employee.userId, employee);
          }
        });

        setEmployeeMap(map);
      } catch (err) {
        console.error('[useEmployeeAvatarsBatch] Error fetching employees:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch employees');
        setEmployeeMap(new Map());
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, graphqlClient]
  );

  useEffect(() => {
    if (userIds.length > 0) {
      fetchEmployees(userIds);
    } else {
      setEmployeeMap(new Map());
      setError(null);
    }
  }, [JSON.stringify(userIds.sort()), fetchEmployees]);

  return {
    employeeMap,
    isLoading,
    error,
    refetch: () => fetchEmployees(userIds)
  };
};

