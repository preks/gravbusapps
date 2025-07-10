import { useState, useEffect, useCallback } from 'react';
import { SelectOption } from '../types';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

interface EmployeesHookParams {
  accessToken: string;
  search?: string;
}

interface EmployeeResponse {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}

const GET_EMPLOYEES_QUERY = `
  query GetEmployees($limit: Int, $offset: Int, $search: String) {
    Employee(
      limit: $limit
      offset: $offset
      where: { 
        _or: [
          { firstName: { _ilike: $search } }
          { lastName: { _ilike: $search } }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      displayName
    }
  }
`;

export const useEmployeesData = ({ accessToken, search }: EmployeesHookParams) => {
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  
  const graphqlClient = useGraphqlClient(accessToken);

  const fetchEmployees = useCallback(async (searchTerm?: string, offset = 0, resetData = false) => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    
    try {
      const searchPattern = searchTerm ? `%${searchTerm}%` : '%%';
      const variables = {
        limit: 50,
        offset,
        search: searchPattern
      };

      const response = await graphqlClient.request<{ Employee: EmployeeResponse[] }>(
        GET_EMPLOYEES_QUERY,
        variables
      );

      const employeesData = response.Employee || [];
      const mappedEmployees: SelectOption[] = employeesData.map((employee: EmployeeResponse) => ({
        id: employee.id,
        name: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
        label: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
        value: employee.id
      }));

      if (resetData) {
        setEmployees(mappedEmployees);
        setCurrentOffset(mappedEmployees.length);
      } else {
        setEmployees(prev => [...prev, ...mappedEmployees]);
        setCurrentOffset(prev => prev + mappedEmployees.length);
      }

      setHasMore(employeesData.length === 50);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [accessToken, graphqlClient]);

  const searchEmployees = useCallback((searchTerm?: string) => {
    setCurrentOffset(0);
    fetchEmployees(searchTerm, 0, true);
  }, [fetchEmployees]);

  const loadMoreEmployees = useCallback(() => {
    if (hasMore && !loading) {
      fetchEmployees(search, currentOffset, false);
    }
  }, [hasMore, loading, fetchEmployees, search, currentOffset]);

  useEffect(() => {
    fetchEmployees(search, 0, true);
  }, [fetchEmployees, search]);

  return {
    employees,
    loading,
    error,
    hasMore,
    searchEmployees,
    loadMoreEmployees
  };
}; 