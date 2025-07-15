import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface UseOpportunityStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export interface OpportunityStatisticsData {
  recentOpportunities: number;
  totalOpportunityValue: number;
  averageWinRate: number;
  totalOpportunitiesThisYear: number;
}

// Query to get recent opportunities count (past two weeks)
export const GET_RECENT_OPPORTUNITIES_COUNT = `
  query GetRecentOpportunitiesCount($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    OpportunityAggregate(where: {
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

// Query to get total opportunity value
export const GET_TOTAL_OPPORTUNITY_VALUE = `
  query GetTotalOpportunityValue($sourceApp: String) {
    OpportunityAggregate(where: {
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
  }
`;

// Query to get average win rate
export const GET_AVERAGE_WIN_RATE = `
  query GetAverageWinRate($sourceApp: String) {
    OpportunityAggregate(where: {
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
  }
`;



// Query to get total opportunities count for this year
export const GET_TOTAL_OPPORTUNITIES_THIS_YEAR_COUNT = `
  query GetTotalOpportunitiesThisYearCount($startOfYear: timestamptz!, $sourceApp: String) {
    OpportunityAggregate(where: {
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

export const useOpportunityStatisticsQueries = (context: UseOpportunityStatisticsQueriesProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { sourceApp } = context;

  const fetchRecentOpportunities = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        OpportunityAggregate: { aggregate: { count: number } }
      }>(GET_RECENT_OPPORTUNITIES_COUNT, { twoWeeksAgo, sourceApp });
      return result.OpportunityAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching recent opportunities count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchTotalOpportunityValue = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        OpportunityAggregate: { aggregate: { sum: { estimatedAmount: number } } }
      }>(GET_TOTAL_OPPORTUNITY_VALUE, { sourceApp });
      return result.OpportunityAggregate.aggregate.sum?.estimatedAmount || 0;
    } catch (error) {
      console.error('Error fetching total opportunity value:', error);
      return 0;
    }
  }, [graphqlClient, sourceApp]);

  const fetchAverageWinRate = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        OpportunityAggregate: { aggregate: { avg: { winningChance: number } } }
      }>(GET_AVERAGE_WIN_RATE, { sourceApp });
      return Math.round(result.OpportunityAggregate.aggregate.avg?.winningChance || 0);
    } catch (error) {
      console.error('Error fetching average win rate:', error);
      return 0;
    }
  }, [graphqlClient, sourceApp]);



  const fetchTotalOpportunitiesThisYear = useCallback(async (): Promise<number> => {
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        OpportunityAggregate: { aggregate: { count: number } }
      }>(GET_TOTAL_OPPORTUNITIES_THIS_YEAR_COUNT, { startOfYear, sourceApp });
      return result.OpportunityAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching total opportunities this year:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  return {
    fetchRecentOpportunities,
    fetchTotalOpportunityValue,
    fetchAverageWinRate,
    fetchTotalOpportunitiesThisYear
  };
}; 