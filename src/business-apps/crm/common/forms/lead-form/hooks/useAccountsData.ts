import { useCallback } from 'react';
import { SelectOption } from '../types';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface AccountResponse {
  id: string;
  name: string;
}

const GET_ACCOUNTS_QUERY = `
  query GetAccounts($limit: Int, $offset: Int, $search: String) {
    Account(
      limit: $limit
      offset: $offset
      where: { name: { _ilike: $search } }
      orderBy: { name: ASC }
    ) {
      id
      name
    }
  }
`;

export const useAccountsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const searchAccounts = useCallback(async (searchTerm: string): Promise<SelectOption[]> => {
    if (!context.accessToken || !searchTerm.trim()) {
      return [];
    }
    
    try {
      const searchPattern = `%${searchTerm}%`;
      const variables = {
        limit: 50,
        offset: 0,
        search: searchPattern
      };

      const response = await graphqlClient.request<{ Account: AccountResponse[] }>(
        GET_ACCOUNTS_QUERY,
        variables
      );

      const accountsData = response.Account || [];
      return accountsData.map((account: AccountResponse) => ({
        value: account.id,
        label: account.name,
        name: account.name,
        id: account.id
      }));
    } catch (err) {
      console.error('Error searching accounts:', err);
      return [];
    }
  }, [context.accessToken, graphqlClient]);

  return {
    searchAccounts
  };
}; 