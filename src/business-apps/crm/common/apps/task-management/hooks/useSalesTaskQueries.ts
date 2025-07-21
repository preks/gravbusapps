import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SalesTaskQueryVariables, SalesTaskResponse } from '../types/SalesTaskTypes';
import { GET_SALES_TASKS, GET_SALES_TASKS_COUNT, GET_SALES_TASKS_WITH_COUNT } from '../queries/SalesTaskQueries';

export interface UseSalesTaskQueriesProps {
  accessToken: string;
}

export interface SalesTaskWithCountResponse extends SalesTaskResponse {
  SalesTaskAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface UseSalesTaskQueriesReturn {
  fetchSalesTasks: (variables?: SalesTaskQueryVariables) => Promise<SalesTaskResponse>;
  fetchSalesTasksCount: (variables?: SalesTaskQueryVariables) => Promise<number>;
  fetchSalesTasksWithCount: (variables?: SalesTaskQueryVariables) => Promise<SalesTaskWithCountResponse>;
}

/**
 * Custom hook for SalesTask GraphQL operations
 * Provides methods to fetch sales tasks and their count
 */
export const useSalesTaskQueries = ({ accessToken }: UseSalesTaskQueriesProps): UseSalesTaskQueriesReturn => {
  const graphqlClient = useGraphQLClient(accessToken);

  const fetchSalesTasks = async (variables: SalesTaskQueryVariables = {}): Promise<SalesTaskResponse> => {
    const query = GET_SALES_TASKS(variables);
    try {
      const result = await graphqlClient.request<SalesTaskResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching sales tasks:', error);
      throw error;
    }
  };

  const fetchSalesTasksCount = async (variables: SalesTaskQueryVariables = {}): Promise<number> => {
    const query = GET_SALES_TASKS_COUNT(variables);
    try {
      const result = await graphqlClient.request<{ SalesTask: { id: string }[] }>(query);
      return result.SalesTask.length;
    } catch (error) {
      console.error('Error fetching sales tasks count:', error);
      throw error;
    }
  };

  const fetchSalesTasksWithCount = async (variables: SalesTaskQueryVariables = {}): Promise<SalesTaskWithCountResponse> => {
    const query = GET_SALES_TASKS_WITH_COUNT(variables);
    try {
      const result = await graphqlClient.request<SalesTaskWithCountResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching sales tasks with count:', error);
      throw error;
    }
  };

  return {
    fetchSalesTasks,
    fetchSalesTasksCount,
    fetchSalesTasksWithCount
  };
};

/**
 * Legacy compatibility wrapper
 * @deprecated Use useSalesTaskQueries with accessToken prop instead
 */
export const useSalesTaskQueriesLegacy = (context: BusinessAppContextProps) => {
  return useSalesTaskQueries({ accessToken: context.accessToken });
}; 