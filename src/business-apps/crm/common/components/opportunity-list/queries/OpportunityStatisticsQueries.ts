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
  mostCommonStage: string;
  mostCommonPipeline: string;
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

// Query to get most common stage in recent opportunities
export const GET_MOST_COMMON_STAGE = `
  query GetMostCommonStage($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    Opportunity(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        stage: {_isNull: false},
        sourceApp: {_eq: $sourceApp},
        isDeleted: {_eq: false}
      }
    ) {
      stage
    }
  }
`;

// Query to get most common pipeline in recent opportunities
export const GET_MOST_COMMON_PIPELINE = `
  query GetMostCommonPipeline($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    Opportunity(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        salesPipeline: {_isNull: false},
        sourceApp: {_eq: $sourceApp},
        isDeleted: {_eq: false}
      }
    ) {
      salesPipeline {
        id
        value
        code
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

  const fetchMostCommonStage = useCallback(async (): Promise<string> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        Opportunity: Array<{ stage: string | null }>
      }>(GET_MOST_COMMON_STAGE, { twoWeeksAgo, sourceApp });

      // Count occurrences of each stage
      const stageCounts: Record<string, number> = {};
      result.Opportunity.forEach(opportunity => {
        const stage = opportunity.stage;
        if (stage) {
          stageCounts[stage] = (stageCounts[stage] || 0) + 1;
        }
      });

      // Find the most common stage
      let mostCommon = 'N/A';
      let maxCount = 0;
      Object.entries(stageCounts).forEach(([stage, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = stage;
        }
      });

      return mostCommon;
    } catch (error) {
      console.error('Error fetching most common stage:', error);
      return 'N/A';
    }
  }, [graphqlClient, sourceApp]);

  const fetchMostCommonPipeline = useCallback(async (): Promise<string> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        Opportunity: Array<{ 
          salesPipeline: { value: string; code: string } | null;
        }>
      }>(GET_MOST_COMMON_PIPELINE, { twoWeeksAgo, sourceApp });

      // Count occurrences of each pipeline
      const pipelineCounts: Record<string, number> = {};
      result.Opportunity.forEach(opportunity => {
        const pipeline = opportunity.salesPipeline;
        if (pipeline && pipeline.value) {
          pipelineCounts[pipeline.value] = (pipelineCounts[pipeline.value] || 0) + 1;
        }
      });

      // Find the most common pipeline
      let mostCommon = 'N/A';
      let maxCount = 0;
      Object.entries(pipelineCounts).forEach(([pipeline, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = pipeline;
        }
      });

      return mostCommon;
    } catch (error) {
      console.error('Error fetching most common pipeline:', error);
      return 'N/A';
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
    fetchMostCommonStage,
    fetchMostCommonPipeline,
    fetchTotalOpportunitiesThisYear
  };
}; 