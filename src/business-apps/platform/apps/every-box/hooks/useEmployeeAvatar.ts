/**
 * Hook to fetch employee avatar data by employee ID
 * Fetches pictureThumbnail, firstName, lastName from GraphQL
 */

import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface EmployeeAvatarData {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  pictureThumbnail?: string;
}

const GET_EMPLOYEE_AVATAR = `
  query GetEmployeeAvatar($employeeId: uuid!) {
    EmployeePosition(
      where: { 
        employeeId: { _eq: $employeeId }
        employee: { isDeleted: { _eq: false } }
      }
      limit: 1
    ) {
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
    }
  }
`;

export const useEmployeeAvatar = (accessToken: string, employeeId?: string) => {
  const [employeeData, setEmployeeData] = useState<EmployeeAvatarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchEmployee = useCallback(
    async (id: string) => {
      if (!id || !accessToken) {
        setEmployeeData(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await graphqlClient.request<{
          EmployeePosition: Array<{
            employee: EmployeeAvatarData;
          }>;
        }>(GET_EMPLOYEE_AVATAR, {
          employeeId: id
        });

        const employee = result?.EmployeePosition?.[0]?.employee;
        if (employee) {
          setEmployeeData(employee);
        } else {
          setEmployeeData(null);
        }
      } catch (err) {
        console.error('Error fetching employee avatar:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch employee');
        setEmployeeData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, graphqlClient]
  );

  useEffect(() => {
    if (employeeId) {
      fetchEmployee(employeeId);
    } else {
      setEmployeeData(null);
      setError(null);
    }
  }, [employeeId, fetchEmployee]);

  return {
    employeeData,
    isLoading,
    error,
    refetch: () => (employeeId ? fetchEmployee(employeeId) : Promise.resolve())
  };
};

