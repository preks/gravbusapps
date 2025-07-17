import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const ACCOUNTS_PER_PAGE = 20;

export interface AccountData {
  id: string;
  name: string;
  businessKey?: string;
  code?: string;
  ownerEmployee?: {
    firstName: string;
    lastName: string;
  };
  website?: string;
  email?: string;
  phone?: string;
}

export interface AccountResponse {
  Account: AccountData[];
  AccountAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface AccountVariables {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface UseAccountsReturn {
  accounts: AccountData[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  searchAccounts: (searchTerm?: string) => void;
  retry: () => void;
}

export const GET_ACCOUNTS = (variables: AccountVariables): string => {
  const searchFilter = variables.search 
    ? `, {
        _or: [
          { name: { _ilike: "%${variables.search}%" } }
          { businessKey: { _ilike: "%${variables.search}%" } }
          { code: { _ilike: "%${variables.search}%" } }
          { email: { _ilike: "%${variables.search}%" } }
          { website: { _ilike: "%${variables.search}%" } }
        ]
      }`
    : '';

  return `
    query GetAccounts {
      Account(
        limit: ${variables.limit || ACCOUNTS_PER_PAGE}
        offset: ${variables.offset || 0}
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
        orderBy: [
          { name: ASC }
          { createdAt: DESC }
        ]
      ) {
        id
        name
        businessKey
        code
        website
        email
        phone
        ownerEmployee {
          firstName
          lastName
        }
      }

      AccountAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const useAccounts = ({ accessToken }: { accessToken: string }): UseAccountsReturn => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [currentSearch, setCurrentSearch] = useState<string>('');

  const graphqlClient = useGraphQLClient(accessToken);

  const fetchAccounts = useCallback(async (searchTerm: string = '', resetOffset: boolean = false) => {
    if (!accessToken) {
      setError('No access token available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentOffset = resetOffset ? 0 : offset;
      const variables: AccountVariables = {
        limit: ACCOUNTS_PER_PAGE,
        offset: currentOffset,
        search: searchTerm.trim() || undefined
      };

      const query = GET_ACCOUNTS(variables);
      const response = await graphqlClient.request<AccountResponse>(query);

      if (response?.Account && response?.AccountAggregate) {
        const newAccounts = response.Account;
        const totalCount = response.AccountAggregate.aggregate.count;

        setAccounts(prevAccounts => 
          resetOffset ? newAccounts : [...prevAccounts, ...newAccounts]
        );
        setTotal(totalCount);
        setHasMore(newAccounts.length === ACCOUNTS_PER_PAGE && (currentOffset + newAccounts.length) < totalCount);
        setOffset(currentOffset + newAccounts.length);
      } else {
        setError('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [accessToken, offset, graphqlClient]);

  const searchAccounts = useCallback((searchTerm: string = '') => {
    setCurrentSearch(searchTerm);
    setOffset(0);
    setAccounts([]);
    setHasMore(true);
    fetchAccounts(searchTerm, true);
  }, [fetchAccounts]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchAccounts(currentSearch, false);
    }
  }, [loading, hasMore, fetchAccounts, currentSearch]);

  const retry = useCallback(() => {
    setOffset(0);
    setAccounts([]);
    setHasMore(true);
    fetchAccounts(currentSearch, true);
  }, [fetchAccounts, currentSearch]);

  // Initial load
  useEffect(() => {
    if (accessToken) {
      fetchAccounts('', true);
    }
  }, [accessToken]); // Only run when accessToken changes

  return {
    accounts,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchAccounts,
    retry
  };
}; 