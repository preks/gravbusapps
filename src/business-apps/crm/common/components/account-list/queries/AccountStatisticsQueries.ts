import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface UseAccountStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export interface AccountStatisticsData {
  recentAccounts: number;
  activeAccounts: number;
  totalAccountsThisYear: number;
  totalRevenue: number;
}

// Query to get recent accounts count (past two weeks)
export const GET_RECENT_ACCOUNTS_COUNT = `
  query GetRecentAccountsCount($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    AccountAggregate(where: {
      createdAt: {_gte: $twoWeeksAgo},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get active accounts count (accounts without liquidation date)
export const GET_ACTIVE_ACCOUNTS_COUNT = `
  query GetActiveAccountsCount($sourceApp: String) {
    AccountAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      liquidationDate: {_isNull: true}
    }) {
      aggregate {
        count
      }
    }
  }
`;



// Query to get total accounts count for this year
export const GET_TOTAL_ACCOUNTS_THIS_YEAR_COUNT = `
  query GetTotalAccountsThisYearCount($startOfYear: timestamptz!, $sourceApp: String) {
    AccountAggregate(where: {
      createdAt: {_gte: $startOfYear},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get total revenue estimates (this would be based on annual revenue data)
export const GET_TOTAL_REVENUE_ESTIMATE = `
  query GetTotalRevenueEstimate($sourceApp: String) {
    Account(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      annualRevenueRef: {_isNull: false}
    }) {
      annualRevenue {
        value
        code
      }
    }
  }
`;

export const useAccountStatisticsQueries = (context: UseAccountStatisticsQueriesProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { sourceApp } = context;

  const fetchRecentAccounts = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        AccountAggregate: { aggregate: { count: number } }
      }>(GET_RECENT_ACCOUNTS_COUNT, { twoWeeksAgo, sourceApp });
      return result.AccountAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching recent accounts count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchActiveAccounts = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        AccountAggregate: { aggregate: { count: number } }
      }>(GET_ACTIVE_ACCOUNTS_COUNT, { sourceApp });
      return result.AccountAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching active accounts count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);



  const fetchTotalAccountsThisYear = useCallback(async (): Promise<number> => {
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        AccountAggregate: { aggregate: { count: number } }
      }>(GET_TOTAL_ACCOUNTS_THIS_YEAR_COUNT, { startOfYear, sourceApp });
      return result.AccountAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching total accounts this year:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchTotalRevenueEstimate = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        Account: Array<{ 
          annualRevenue: { value: string; code: string } | null;
        }>
      }>(GET_TOTAL_REVENUE_ESTIMATE, { sourceApp });

      // Sum up all annual revenue values
      let totalRevenue = 0;
      result.Account.forEach(account => {
        const revenueValue = account.annualRevenue?.value;
        if (revenueValue && !isNaN(Number(revenueValue))) {
          totalRevenue += Number(revenueValue);
        }
      });

      return totalRevenue;
    } catch (error) {
      console.error('Error fetching total revenue estimate:', error);
      return 0;
    }
  }, [graphqlClient, sourceApp]);

  return {
    fetchRecentAccounts,
    fetchActiveAccounts,
    fetchTotalAccountsThisYear,
    fetchTotalRevenueEstimate
  };
}; 