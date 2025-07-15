import { useState, useEffect, useCallback, useRef } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getEmployeesPerYearQuery } from '../queries/getEmployeesPerYear';
import dayjs from 'dayjs';

/**
 * Interface for yearly employee count data
 */
export interface YearlyEmployeeData {
  year: number;
  count: number;
}

/**
 * GraphQL response type for employees per year query
 */
interface EmployeesPerYearResponse {
  EmployeeAggregate: {
    aggregate: {
      count: number;
    };
  };
}

/**
 * Hook to fetch total employee count for each of the past 5 years
 * 
 * @param accessToken - Access token for API authentication
 * @returns Object containing employees per year data array, loading state, error, and refetch function
 */
export const useEmployeesPerYear = (accessToken: string) => {
  const [data, setData] = useState<YearlyEmployeeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef<boolean>(true);

  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);

  // Fetch employee counts for the last 5 years
  const fetchEmployeesPerYear = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useEmployeesPerYear] No access token provided'));
        setLoading(false);
      }
      return;
    }
    
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      const currentYear = dayjs().year();
      const results: YearlyEmployeeData[] = [];
      
      // Fetch data for each of the last 5 years
      for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const endOfYear = `${year}-12-31 23:59:59`;
        
        // Log the query parameters for debugging
        console.log(`[useEmployeesPerYear] Fetching employee count for year ${year}, as of ${endOfYear}`);
        
        const response = await graphQLClient.request<EmployeesPerYearResponse>(getEmployeesPerYearQuery, { 
          year: endOfYear 
        });
        
        const count = response.EmployeeAggregate.aggregate.count;
        
        // Log the response for debugging
        console.log(`[useEmployeesPerYear] Year ${year}: ${count} employees`);
        
        results.unshift({ year, count });
      }
      
      if (isMounted.current) {
        setData(results);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useEmployeesPerYear] Error fetching employee counts:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }, [accessToken, graphQLClient]);

  useEffect(() => {
    isMounted.current = true;
    fetchEmployeesPerYear();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchEmployeesPerYear]);

  // Function to manually refetch the data
  const refetch = useCallback(() => {
    fetchEmployeesPerYear();
  }, [fetchEmployeesPerYear]);

  return {
    data,
    loading,
    error,
    refetch
  };
};
