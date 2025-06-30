import { useState, useEffect, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';
import { getAccountsQuery } from '../queries/getAccountsQuery';

export interface Account {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface UseAccountsDataResult {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAccountsData(accessToken: string): UseAccountsDataResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  
  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Function to fetch accounts
  const fetchAccounts = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token available, skipping accounts fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await graphQLClient.request(
        getAccountsQuery,
        {
          offset: 0,
        }
      );
      
      // Check if response has the expected structure
      if (!response || !response.Account) {
        console.warn('Invalid accounts response structure:', response);
        setAccounts([]);
        return;
      }
      
      const transformedAccounts = response.Account.map((account: any) => ({
        id: account.id,
        name: account.name,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }));
      
      setAccounts(transformedAccounts);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken]);
  
  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1);
  }, []);
  
  // Fetch accounts on mount and when refetch is called
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, accessToken, refetchCount]);
  
  return { accounts, loading, error, refetch };
}
