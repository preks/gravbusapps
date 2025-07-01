import { useState, useEffect, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';
import { getEmployeesQuery } from '../queries/getEmployeesQuery';

export interface Employee {
  id: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

interface UseEmployeesDataResult {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEmployeesData(accessToken: string): UseEmployeesDataResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  
  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Function to fetch employees
  const fetchEmployees = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token available, skipping employees fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await graphQLClient.request(
        getEmployeesQuery,
        {
          offset: 0,
        }
      );
      
      // Check if response has the expected structure
      if (!response || !response.Employee) {
        console.warn('Invalid employees response structure:', response);
        setEmployees([]);
        return;
      }
      
      const transformedEmployees = response.Employee.map((employee: any) => ({
        id: employee.id,
        fullName: employee.fullName,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      }));
      
      setEmployees(transformedEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken]);
  
  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1);
  }, []);
  
  // Fetch employees on mount and when refetch is called
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, accessToken, refetchCount]);
  
  return { employees, loading, error, refetch };
}
