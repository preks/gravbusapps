import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_INVESTMENT_NOTE_BY_ID } from '@/common/data/investment/queries/investmentQueries';
import type { InvestmentNote } from '@/common/data/investment/types';

interface InvestmentNoteResponse {
  InvestmentNote: InvestmentNote[];
}

export const useGetInvestmentNoteById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentNoteById = useCallback(async (noteId: string): Promise<{ note: InvestmentNote | null }> => {
    const query = GET_INVESTMENT_NOTE_BY_ID(noteId);

    try {
      const result = await graphqlClient.request<InvestmentNoteResponse>(query);
      const note = result.InvestmentNote?.[0] || null;
      return { note };
    } catch (error) {
      console.error('Error fetching investment note by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentNoteById };
};
