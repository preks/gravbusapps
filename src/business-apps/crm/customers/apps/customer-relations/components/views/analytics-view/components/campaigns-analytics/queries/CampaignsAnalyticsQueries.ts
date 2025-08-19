import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import {
  GET_CAMPAIGNS_ANALYTICS_METRICS,
  GET_CAMPAIGNS_PERFORMANCE_COMPARISON,
  GET_CAMPAIGNS_TIMELINE_ANALYSIS,
  GET_TOP_PERFORMING_CAMPAIGNS,
  GET_TOP_PERFORMING_EMPLOYEES,
} from './CampaignsAnalyticsGraphQL';

// Response interfaces
interface CampaignsMetricsResponse {
  totalCampaigns: {
    aggregate: { count: number };
  };
  activeCampaigns: {
    aggregate: { count: number };
  };
  upcomingCampaigns: {
    aggregate: { count: number };
  };
  completedCampaigns: {
    aggregate: { count: number };
  };
  campaigns: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    leadAggregate: {
      aggregate: { count: number };
    };
    accountAggregate: {
      aggregate: { count: number };
    };
    contactAggregate: {
      aggregate: { count: number };
    };
    opportunityAggregate: {
      aggregate: { count: number };
    };
    wonOpportunityAggregate: {
      aggregate: {
        count: number;
        sum: { estimatedAmount: number | null };
      };
    };
  }>;
}

interface CampaignPerformanceResponse {
  campaigns: Array<{
    id: string;
    name: string;
    typeRef: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    leadAggregate: {
      aggregate: { count: number };
    };
    accountAggregate: {
      aggregate: { count: number };
    };
    contactAggregate: {
      aggregate: { count: number };
    };
    opportunityAggregate: {
      aggregate: { count: number };
    };
    wonOpportunityAggregate: {
      aggregate: { count: number };
    };
    revenueAggregate: {
      aggregate: {
        sum: { estimatedAmount: number | null };
      };
    };
  }>;
}

interface CampaignsTimelineAnalysisResponse {
  campaigns: Array<{
    id: string;
    name: string;
    createdAt: string;
    startDate: string;
    endDate: string;
    lead: Array<{
      id: string;
      createdAt: string;
    }>;
    account: Array<{
      id: string;
      createdAt: string;
    }>;
    contact: Array<{
      id: string;
      createdAt: string;
    }>;
    opportunity: Array<{
      id: string;
      createdAt: string;
      estimatedAmount: number;
      opportunityStatus: {
        value: string;
      } | null;
    }>;
  }>;
}

interface TopPerformingCampaignsResponse {
  campaigns: Array<{
    id: string;
    name: string;
    typeRef: string;
    type: {
      id: string;
      value: string;
      code: string;
    };
    startDate: string;
    endDate: string;
    createdAt: string;
    leadAggregate: {
      aggregate: { count: number };
    };
    accountAggregate: {
      aggregate: { count: number };
    };
    contactAggregate: {
      aggregate: { count: number };
    };
    opportunityAggregate: {
      aggregate: { count: number };
    };
    wonOpportunityAggregate: {
      aggregate: { count: number };
    };
    revenueAggregate: {
      aggregate: {
        sum: { estimatedAmount: number | null };
      };
    };
  }>;
}

interface TopPerformingEmployeesResponse {
  campaigns: Array<{
    id: string;
    name: string;
    lead: Array<{
      id: string;
      ownerEmployee: {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
      };
      account: {
        id: string;
      } | null;
    }>;
    account: Array<{
      id: string;
      ownerEmployee: {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
      };
    }>;
    contact: Array<{
      id: string;
      ownerEmployee: {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
      };
    }>;
    opportunity: Array<{
      id: string;
      estimatedAmount: number;
      opportunityStatus: {
        value: string;
      } | null;
      ownerEmployee: {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
      };
    }>;
  }>;
}

export const useCampaignsAnalyticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCampaignsAnalyticsMetrics = useCallback(async (): Promise<CampaignsMetricsResponse> => {
    const query = GET_CAMPAIGNS_ANALYTICS_METRICS();
    try {
      const result = await graphqlClient.request<CampaignsMetricsResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching campaigns analytics metrics:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchCampaignsPerformanceComparison = useCallback(async (): Promise<CampaignPerformanceResponse> => {
    const query = GET_CAMPAIGNS_PERFORMANCE_COMPARISON();
    try {
      const result = await graphqlClient.request<CampaignPerformanceResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching campaigns performance comparison:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchCampaignsTimelineAnalysis = useCallback(async (): Promise<CampaignsTimelineAnalysisResponse> => {
    const query = GET_CAMPAIGNS_TIMELINE_ANALYSIS();
    try {
      const result = await graphqlClient.request<CampaignsTimelineAnalysisResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching campaigns timeline analysis:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchTopPerformingCampaigns = useCallback(async (): Promise<TopPerformingCampaignsResponse> => {
    const query = GET_TOP_PERFORMING_CAMPAIGNS();
    try {
      const result = await graphqlClient.request<TopPerformingCampaignsResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching top performing campaigns:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchTopPerformingEmployees = useCallback(async (): Promise<TopPerformingEmployeesResponse> => {
    const query = GET_TOP_PERFORMING_EMPLOYEES();
    try {
      const result = await graphqlClient.request<TopPerformingEmployeesResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching top performing employees:', error);
      throw error;
    }
  }, [graphqlClient]);

  return {
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    fetchTopPerformingEmployees,
  };
};
