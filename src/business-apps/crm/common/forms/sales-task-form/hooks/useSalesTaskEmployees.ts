import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface UseSalesTaskEmployeesParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SalesTaskEmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

const GET_SALES_TASK_EMPLOYEES_QUERY = `
  query GetSalesTaskEmployees($limit: Int, $offset: Int, $search: String) {
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

export const useSalesTaskEmployees = (accessToken: string, params?: UseSalesTaskEmployeesParams) => {
  const [data, setData] = useState<SalesTaskEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchEmployees = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token provided to useSalesTaskEmployees');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let searchPattern: string;
      let limit: number;

      if (params?.search && params.search.trim().length >= 2) {
        // User is searching - use search pattern and higher limit
        searchPattern = `%${params.search.trim()}%`;
        limit = 50;
      } else {
        // No search or search too short - get more employees alphabetically (increased from 10 to limit or 100)
        searchPattern = '%%';
        limit = params?.limit || 100;
      }

      const variables = {
        search: searchPattern,
        limit: params?.limit || limit,
        offset: params?.offset || 0
      };

      const result = await graphqlClient.request<{ Employee: SalesTaskEmployee[] }>(
        GET_SALES_TASK_EMPLOYEES_QUERY,
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
      
      setData(processedEmployees);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch sales task employees');
      setError(error);
      console.error('Error fetching sales task employees:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, params?.search, params?.limit, params?.offset, graphqlClient]);

  useEffect(() => {
    if (accessToken) {
      fetchEmployees();
    }
  }, [accessToken, params?.search, params?.limit, params?.offset, fetchEmployees]);

  return { data, loading, error };
}; 