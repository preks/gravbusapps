import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface EmployeeData {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  displayName: string | null;
  preferredName: string | null;
}

export interface UseEmployeeNameProps {
  userId: string;
  accessToken?: string;
}

export interface UseEmployeeNameReturn {
  employee: EmployeeData | null;
  displayName: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch employee name data by userId from Employee table via GraphQL
 */
export const useEmployeeName = ({
  userId,
  accessToken,
}: UseEmployeeNameProps): UseEmployeeNameReturn => {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken || '');

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!userId || !accessToken) {
        setEmployee(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`[useEmployeeName] Fetching employee data for userId: ${userId}`);

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

        const result = await graphqlClient.request(GET_EMPLOYEE_BY_USER_ID, {
          userId
        });

        if (result.Employee?.length > 0) {
          const employeeData = result.Employee[0];
          console.log(`[useEmployeeName] Found employee data:`, employeeData);
          setEmployee(employeeData);
        } else {
          console.log(`[useEmployeeName] No employee found for userId: ${userId}`);
          setEmployee(null);
        }
      } catch (err) {
        console.error(`[useEmployeeName] Error fetching employee for userId ${userId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch employee data');
        setEmployee(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [userId, accessToken, graphqlClient]);

  // Generate display name from available fields
  const displayName = employee ? (
    employee.displayName || 
    employee.fullName || 
    employee.preferredName ||
    (employee.firstName && employee.lastName ? `${employee.firstName} ${employee.lastName}` : null) ||
    employee.firstName ||
    employee.lastName ||
    'Unknown User'
  ) : null;

  return {
    employee,
    displayName,
    isLoading,
    error,
  };
};
