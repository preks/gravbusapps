import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_INVESTMENT_TASKS_BY_INVESTMENT_ID } from '@/common/data/investment/queries/investmentQueries';
import type { InvestmentTask } from '@/common/data/investment/types';

interface InvestmentTasksByInvestmentIdResponse {
  InvestmentTask: InvestmentTask[];
}

export const useGetInvestmentTasksByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentTasksByInvestmentId = useCallback(async (investmentId: string): Promise<InvestmentTask[]> => {
    const query = GET_INVESTMENT_TASKS_BY_INVESTMENT_ID(investmentId);

    try {
      const result = await graphqlClient.request<InvestmentTasksByInvestmentIdResponse>(query);
      return result.InvestmentTask || [];
    } catch (error) {
      console.error('Error fetching investment tasks by investment ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentTasksByInvestmentId };
};
