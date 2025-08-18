import { useState, useEffect, useCallback, useRef } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getTurnoverRateQuery } from '../queries/getTurnoverRate';
import dayjs from 'dayjs';

/**
 * GraphQL response type for terminated employee count query
 */
interface TerminatedEmployeeCountResponse {
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      count: number;
    };
  };
}

/**
 * Hook to calculate the turnover rate based on employee terminations
 * Uses EmployeeWorkingCondition.exitDate to identify when employees left the company
 * 
 * @param accessToken - Access token for API authentication
 * @param totalEmployees - Current total employee count for rate calculation
 * @returns Object containing turnover rate, loading state, error, and refetch function
 */
export const useTurnoverRate = (accessToken: string, totalEmployees: number) => {
  // Define all hooks at the top level to ensure consistent order
  const [rate, setRate] = useState<number>(0);
  const [terminatedCount, setTerminatedCount] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef<boolean>(true);
  
  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken);
  
  /**
   * Get the start and end dates for the previous month in YYYY-MM-DD HH:mm:ss format
   * which is compatible with the GraphQL API's timestamp type (without timezone)
   */
  const getPreviousMonthDateRange = useCallback(() => {
    const now = dayjs();
    const previousMonth = now.subtract(1, 'month');
    // Format as YYYY-MM-DD HH:mm:ss for timestamp type (without timezone)
    const startOfPreviousMonth = previousMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss');
    const endOfPreviousMonth = previousMonth.endOf('month').format('YYYY-MM-DD HH:mm:ss');
    
    // Log the date range for debugging
    console.log(`[useTurnoverRate] Previous month date range: ${startOfPreviousMonth} to ${endOfPreviousMonth}`);
    
    return {
      startDate: startOfPreviousMonth,
      endDate: endOfPreviousMonth
    };
  }, []);

  /**
   * Fetch terminated employee count from GraphQL API and calculate turnover rate
   */
  const calculateTurnoverRate = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('No access token provided'));
        setLoading(false);
      }
      return;
    }

    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      // Get date range for previous month
      const { startDate, endDate } = getPreviousMonthDateRange();
      
      console.log('[useTurnoverRate] Fetching terminated employees using exitDate between', startDate, 'and', endDate);

      // Execute the GraphQL query with variables
      const response = await graphQLClient.request<TerminatedEmployeeCountResponse>(
        getTurnoverRateQuery, 
        { startDate, endDate }
      );
      
      // Log the response for debugging
      console.log('[useTurnoverRate] GraphQL response:', response);
      
      // Validate response structure
      if (!response || !response.EmployeeWorkingConditionAggregate || !response.EmployeeWorkingConditionAggregate.aggregate) {
        throw new Error('Invalid response structure from GraphQL API');
      }
      
      // Extract and validate terminated employee count
      const terminated = Number(response.EmployeeWorkingConditionAggregate.aggregate.count);
      if (isNaN(terminated)) {
        throw new Error('Terminated employee count is not a valid number');
      }
      
      // Calculate turnover rate as percentage: (terminated / total) * 100
      // Default to 0 if totalEmployees is 0 to avoid division by zero
      const turnoverRate = totalEmployees > 0 ? (terminated / totalEmployees) * 100 : 0;
      
      // Round to 1 decimal place
      const roundedRate = Math.round(turnoverRate * 10) / 10;
      
      // Mock change data for now - in a real implementation this would be calculated
      // by comparing with the previous period
      const changeValue = -0.8; // Decrease of 0.8%
      
      // Update state if component is still mounted
      if (isMounted.current) {
        setTerminatedCount(terminated);
        setRate(roundedRate);
        setChange(changeValue);
        setError(null);
      }
      
      console.log(`[useTurnoverRate] Calculated: ${terminated} terminations out of ${totalEmployees} total = ${roundedRate}% turnover rate`);
      
    } catch (err) {
      console.error('[useTurnoverRate] Error calculating turnover rate:', err);
      
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to calculate turnover rate'));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [accessToken, graphQLClient, getPreviousMonthDateRange, totalEmployees]);

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true;
    
    // Only calculate turnover rate if we have the total employee count
    if (totalEmployees >= 0) {
      calculateTurnoverRate();
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [calculateTurnoverRate, totalEmployees]);

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    calculateTurnoverRate();
  }, [calculateTurnoverRate]);

  return {
    rate,
    terminatedCount,
    change,
    loading,
    error,
    refetch
  };
};
