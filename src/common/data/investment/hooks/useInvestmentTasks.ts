// Investment Task hooks - list and search operations for investment tasks
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Types
import type { BaseInvestmentTask, InvestmentTask } from '../types';

// Queries
import { GET_INVESTMENT_TASKS, type InvestmentTaskQueryVariables } from '../queries/investmentTaskQueries';

// Mapper
import { toInvestmentTask } from '../mappers';

export interface InvestmentTaskListQueryResponse {
  InvestmentTask: BaseInvestmentTask[];
  InvestmentTaskAggregate: {
    aggregate: { count: number };
  };
}

export interface InvestmentTaskListData {
  tasks: InvestmentTask[];
  total: number;
}

export const useInvestmentTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentTasks = useCallback(async (variables: InvestmentTaskQueryVariables = {}): Promise<InvestmentTaskListData> => {
    const query = GET_INVESTMENT_TASKS(variables);

    try {
      const result = await graphqlClient.request<InvestmentTaskListQueryResponse>(query);
      const tasks = result.InvestmentTask.map(toInvestmentTask);
      const total = result.InvestmentTaskAggregate?.aggregate?.count || 0;
      return { tasks, total };
    } catch (error) {
      console.error('Error fetching investment tasks:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentTasks };
};


