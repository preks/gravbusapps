import { useState, useCallback } from 'react';
import { Account, UseAccountListDataReturn } from '../types';

interface UseAccountListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  accessToken: string;
  sourceApp?: string;
  accountTypes?: string[];
  industries?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export const useAccountListData = (params: UseAccountListDataParams): UseAccountListDataReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(async (page: number, pageSize = 20, additionalFilters?: any) => {
    if (!params.accessToken) {
      console.warn('No access token provided for account data loading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mock data for now - will be replaced with actual GraphQL queries
      const mockAccounts: Account[] = Array.from({ length: pageSize }, (_, index) => ({
        id: `account-${page}-${index + 1}`,
        name: `Account ${(page - 1) * pageSize + index + 1}`,
        website: `www.account${(page - 1) * pageSize + index + 1}.com`,
        phone: `+1-555-${String(100 + index).padStart(3, '0')}-0000`,
        email: `contact@account${(page - 1) * pageSize + index + 1}.com`,
        industry: {
          id: `industry-${index % 5}`,
          value: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail'][index % 5]
        },
        type: {
          id: `type-${index % 4}`,
          value: ['Customer', 'Prospect', 'Partner', 'Competitor'][index % 4]
        },
        ownerEmployee: {
          id: `employee-${index}`,
          firstName: `Owner${index}`,
          lastName: 'Employee',
          displayName: `Owner${index} Employee`,
          pictureThumbnail: undefined
        },
        annualRevenue: (index + 1) * 100000,
        numberOfEmployees: (index + 1) * 10,
        sourceApp: params.sourceApp,
        createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }));

      setAccounts(mockAccounts);
      setTotal(params.sourceApp === 'CRM' ? 106 : 7); // Mock totals based on sourceApp
      setHasMore(page * pageSize < (params.sourceApp === 'CRM' ? 106 : 7));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [params.accessToken, params.sourceApp, params.search, params.sortField, params.sortOrder, params.accountTypes, params.industries, params.createdAfter, params.createdBefore]);

  const loadMore = useCallback(() => {
    // Load more functionality for infinite scroll
    console.log('Load more accounts requested');
  }, []);

  const retry = useCallback(() => {
    console.log('Retrying account data load');
    // Will be implemented with actual retry logic
  }, []);

  return {
    accounts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  };
}; 