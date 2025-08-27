import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface UseContactStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp: string;
}

interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

// Enhanced queries that fetch both current and previous period data for trend calculations

// Query to get recent contacts count (current 2 weeks vs previous 2 weeks)
export const GET_RECENT_CONTACTS_WITH_TREND = `
  query GetRecentContactsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!, $sourceApp: String) {
    current: ContactAggregate(where: {
      createdAt: {_gte: $currentStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: ContactAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get active contacts count (current vs last month)
export const GET_ACTIVE_CONTACTS_WITH_TREND = `
  query GetActiveContactsWithTrend($lastMonth: timestamptz!, $sourceApp: String) {
    current: ContactAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      activeTo: {_isNull: true}
    }) {
      aggregate {
        count
      }
    }
    previous: ContactAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      activeTo: {_isNull: true},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get email engagements (current vs last month)
export const GET_EMAIL_ENGAGEMENTS_WITH_TREND = `
  query GetEmailEngagementsWithTrend($lastMonth: timestamptz!, $sourceApp: String) {
    current: ContactAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      email: {_isNull: false}
    }) {
      aggregate {
        count
      }
    }
    previous: ContactAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      email: {_isNull: false},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get contacts this year vs same period last year
export const GET_CONTACTS_THIS_YEAR_WITH_TREND = `
  query GetContactsThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!, $sourceApp: String) {
    current: ContactAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: ContactAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

export const useContactStatisticsQueries = (context: UseContactStatisticsQueriesProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { sourceApp } = context;

  const calculateTrend = (current: number, previous: number): TrendData => {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
    return {
      current,
      previous,
      change,
      changePercent,
      isPositive: change >= 0
    };
  };

  const fetchRecentContactsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const currentStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const previousEnd = currentStart;
      const previousStart = new Date(currentStart.getTime() - (14 * 24 * 60 * 60 * 1000));
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_RECENT_CONTACTS_WITH_TREND, { 
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        sourceApp 
      });
      
      return calculateTrend(
        result.current.aggregate.count,
        result.previous.aggregate.count
      );
    } catch (error) {
      console.error('Error fetching recent contacts with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchActiveContactsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_ACTIVE_CONTACTS_WITH_TREND, { 
        lastMonth: lastMonth.toISOString(),
        sourceApp 
      });
      
      return calculateTrend(
        result.current.aggregate.count,
        result.previous.aggregate.count
      );
    } catch (error) {
      console.error('Error fetching active contacts with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchEmailEngagementsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_EMAIL_ENGAGEMENTS_WITH_TREND, { 
        lastMonth: lastMonth.toISOString(),
        sourceApp 
      });
      
      return calculateTrend(
        result.current.aggregate.count,
        result.previous.aggregate.count
      );
    } catch (error) {
      console.error('Error fetching email engagements with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchContactsThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_CONTACTS_THIS_YEAR_WITH_TREND, { 
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        sourceApp 
      });
      
      return calculateTrend(
        result.current.aggregate.count,
        result.previous.aggregate.count
      );
    } catch (error) {
      console.error('Error fetching contacts this year with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  return {
    // Enhanced methods with trend data
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
  };
}; 