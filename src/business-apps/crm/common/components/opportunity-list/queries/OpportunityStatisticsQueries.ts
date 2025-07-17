import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface UseOpportunityStatisticsQueriesProps extends BusinessAppContextProps {
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

// Query to get recent opportunities count (current 2 weeks vs previous 2 weeks)
export const GET_RECENT_OPPORTUNITIES_WITH_TREND = `
  query GetRecentOpportunitiesWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!, $sourceApp: String) {
    current: OpportunityAggregate(where: {
      createdAt: {_gte: $currentStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: OpportunityAggregate(where: {
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

// Query to get total opportunity value with trend (current vs last quarter)
export const GET_OPPORTUNITY_VALUE_WITH_TREND = `
  query GetOpportunityValueWithTrend($lastQuarter: timestamptz!, $sourceApp: String) {
    current: OpportunityAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      estimatedAmount: {_isNull: false}
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    previous: OpportunityAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      estimatedAmount: {_isNull: false},
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
  }
`;

// Query to get average win rate with trend (current vs last quarter)
export const GET_WIN_RATE_WITH_TREND = `
  query GetWinRateWithTrend($lastQuarter: timestamptz!, $sourceApp: String) {
    current: OpportunityAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      winningChance: {_isNull: false}
    }) {
      aggregate {
        avg {
          winningChance
        }
      }
    }
    previous: OpportunityAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      winningChance: {_isNull: false},
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate {
        avg {
          winningChance
        }
      }
    }
  }
`;

// Query to get opportunities this year vs same period last year
export const GET_OPPORTUNITIES_THIS_YEAR_WITH_TREND = `
  query GetOpportunitiesThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!, $sourceApp: String) {
    current: OpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: OpportunityAggregate(where: {
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

export const useOpportunityStatisticsQueries = (context: UseOpportunityStatisticsQueriesProps) => {
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

  const fetchRecentOpportunitiesWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const currentStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const previousEnd = currentStart;
      const previousStart = new Date(currentStart.getTime() - (14 * 24 * 60 * 60 * 1000));
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_RECENT_OPPORTUNITIES_WITH_TREND, { 
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
      console.error('Error fetching recent opportunities with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchOpportunityValueWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { sum: { estimatedAmount: number } } };
        previous: { aggregate: { sum: { estimatedAmount: number } } };
      }>(GET_OPPORTUNITY_VALUE_WITH_TREND, { 
        lastQuarter: lastQuarter.toISOString(),
        sourceApp 
      });
      
      const currentValue = result.current.aggregate.sum?.estimatedAmount || 0;
      const previousValue = result.previous.aggregate.sum?.estimatedAmount || 0;
      
      return calculateTrend(currentValue, previousValue);
    } catch (error) {
      console.error('Error fetching opportunity value with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchWinRateWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { avg: { winningChance: number } } };
        previous: { aggregate: { avg: { winningChance: number } } };
      }>(GET_WIN_RATE_WITH_TREND, { 
        lastQuarter: lastQuarter.toISOString(),
        sourceApp 
      });
      
      const currentRate = Math.round(result.current.aggregate.avg?.winningChance || 0);
      const previousRate = Math.round(result.previous.aggregate.avg?.winningChance || 0);
      
      return calculateTrend(currentRate, previousRate);
    } catch (error) {
      console.error('Error fetching win rate with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchOpportunitiesThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_OPPORTUNITIES_THIS_YEAR_WITH_TREND, { 
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
      console.error('Error fetching opportunities this year with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  return {
    // Enhanced methods with trend data
    fetchRecentOpportunitiesWithTrend,
    fetchOpportunityValueWithTrend,
    fetchWinRateWithTrend,
    fetchOpportunitiesThisYearWithTrend
  };
}; 