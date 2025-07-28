import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface TaskEmployee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

export interface UseTaskEmployeesProps {
  accessToken: string;
  search?: string;
}

export interface UseTaskEmployeesReturn {
  employees: TaskEmployee[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const GET_TASK_EMPLOYEES_QUERY = `
  query GetTaskEmployees($limit: Int, $offset: Int, $search: String) {
    Employee(
      limit: $limit
      offset: $offset
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $search } }
              { lastName: { _ilike: $search } }
              { displayName: { _ilike: $search } }
            ]
          }
        ]
      }
      orderBy: { displayName: ASC }
    ) {
      id
      firstName
      lastName
      displayName
    }
  }
`;

export const useTaskEmployees = ({ accessToken, search = '' }: UseTaskEmployeesProps): UseTaskEmployeesReturn => {
  const [employees, setEmployees] = useState<TaskEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);

  const fetchEmployees = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskEmployees');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let searchPattern: string;
      let limit: number;

      if (search && search.trim().length >= 2) {
        // User is searching - use search pattern and higher limit
        searchPattern = `%${search.trim()}%`;
        limit = 50;
      } else {
        // No search or search too short - get first 3 employees alphabetically
        searchPattern = '%%';
        limit = 3;
      }

      const variables = {
        search: searchPattern,
        limit,
        offset: 0
      };

      const result = await graphqlClient.request<{ Employee: TaskEmployee[] }>(
        GET_TASK_EMPLOYEES_QUERY,
        variables
      );

      const employeeData = result.Employee || [];
      
      // Process and format employees
      const processedEmployees = employeeData.map(emp => ({
        id: emp.id,
        displayName: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
        firstName: emp.firstName || '',
        lastName: emp.lastName || ''
      }));
      setEmployees(processedEmployees);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch task employees');
      setError(error);
      console.error('Error fetching task employees:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, graphqlClient]);

  const refetch = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (accessToken) {
      fetchEmployees();
    }
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    refetch
  };
}; 