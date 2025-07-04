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
  loadMore: () => void;
  hasMore: boolean;
  search: (searchText: string) => void;
}

export function useAccountsData(accessToken: string): UseAccountsDataResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const limit = 20;
  
  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Function to fetch accounts
  const fetchAccounts = useCallback(async (currentOffset: number, isLoadMore: boolean = false, currentSearchText: string = '') => {
    if (!accessToken) {
      console.warn('No access token available, skipping accounts fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    if (!isLoadMore) {
      setError(null);
    }
    
    try {
      let whereCondition = {};
      
      if (currentSearchText && currentSearchText.trim() !== '') {
        whereCondition = {
          name: {
            _iregex: currentSearchText
          } 
        };
      }

      console.log("Fetching accounts with search:", currentSearchText, "Where condition:", whereCondition);

      const response = await graphQLClient.request(
        getAccountsQuery,
        {
          offset: currentOffset,
          limit: limit,
          where: whereCondition
        }
      );
      // Check if response has the expected structure
      if (!response || !response.Account) {
        console.warn('Invalid accounts response structure:', response);
        if (!isLoadMore) {
          setAccounts([]);
        }
        return;
      }
      
      const transformedAccounts = response.Account.map((account: any) => ({
        id: account.id,
        name: account.name,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }));
      
      setHasMore(transformedAccounts.length === limit);
      
      if (isLoadMore) {
        setAccounts(prev => [...prev, ...transformedAccounts]);
      } else {
        setAccounts(transformedAccounts);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken, limit]);
  
  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setOffset(0);
    setRefetchCount(prev => prev + 1);
  }, []);
  
  // Function to load more accounts
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchAccounts(newOffset, true, searchText);
    }
  }, [loading, hasMore, offset, limit, fetchAccounts, searchText]);
  
  const search = useCallback((text: string) => {
    setSearchText(text);
    setOffset(0);
    fetchAccounts(0, false, text);
  }, [fetchAccounts]);
  
  // Fetch accounts on mount and when refetch is called
  useEffect(() => {
    fetchAccounts(0, false, searchText);
    setOffset(0);
  }, [fetchAccounts, accessToken, refetchCount]);
  
  return { accounts, loading, error, refetch, loadMore, hasMore, search };
}
