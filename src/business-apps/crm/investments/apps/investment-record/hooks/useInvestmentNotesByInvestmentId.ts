import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_INVESTMENT_NOTES_BY_INVESTMENT_ID } from '@/common/data/investment/queries/investmentQueries';
import type { InvestmentNote } from '@/common/data/investment/types';

interface InvestmentNotesByInvestmentIdResponse {
  InvestmentNote: InvestmentNote[];
}

export const useGetInvestmentNotesByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentNotesByInvestmentId = useCallback(async (investmentId: string): Promise<InvestmentNote[]> => {
    const query = GET_INVESTMENT_NOTES_BY_INVESTMENT_ID(investmentId);

    try {
      const result = await graphqlClient.request<InvestmentNotesByInvestmentIdResponse>(query);
      return result.InvestmentNote || [];
    } catch (error) {
      console.error('Error fetching investment notes by investment ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentNotesByInvestmentId };
};
