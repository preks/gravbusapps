import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface UseLeadStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export interface LeadStatisticsData {
  recentLeads: number;
  hotLeads: number;
  mostCommonLeadSource: string;
  mostCommonIndustry: string;
  convertedLeadsThisYear: number;
  conversionRateThisYear: number;
  totalLeadsThisYear: number;
}

// Query to get recent leads count (past two weeks)
export const GET_RECENT_LEADS_COUNT = `
  query GetRecentLeadsCount($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    LeadAggregate(where: {
      createdAt: {_gte: $twoWeeksAgo},
      sourceApp: {_eq: $sourceApp}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get hot leads count (HOT and WARM ratings)
export const GET_HOT_LEADS_COUNT = `
  query GetHotLeadsCount($sourceApp: String) {
    LeadAggregate(where: {
      leadRatingRef: {_in: ["SalesLeadRating:v1:HOT", "SalesLeadRating:v1:WARM"]},
      sourceApp: {_eq: $sourceApp}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get most common lead source in recent leads
export const GET_MOST_COMMON_LEAD_SOURCE = `
  query GetMostCommonLeadSource($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    Lead(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        leadSourceRef: {_isNull: false},
        sourceApp: {_eq: $sourceApp}
      }
    ) {
      leadSource {
        value
        code
      }
      leadSourceRef
    }
  }
`;

// Query to get most common industry in recent leads
export const GET_MOST_COMMON_INDUSTRY = `
  query GetMostCommonIndustry($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    Lead(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        industryRef: {_isNull: false},
        sourceApp: {_eq: $sourceApp}
      }
    ) {
      industry {
        value
        code
      }
      industryRef
    }
  }
`;

// Query to get converted leads count for this year
export const GET_CONVERTED_LEADS_THIS_YEAR_COUNT = `
  query GetConvertedLeadsThisYearCount($startOfYear: timestamptz!, $sourceApp: String) {
    LeadAggregate(where: {
      leadStatusRef: {_eq: "SalesLeadStatus:v1:CONVERTED"},
      createdAt: {_gte: $startOfYear},
      sourceApp: {_eq: $sourceApp}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get total leads count for this year (for conversion rate calculation)
export const GET_TOTAL_LEADS_THIS_YEAR_COUNT = `
  query GetTotalLeadsThisYearCount($startOfYear: timestamptz!, $sourceApp: String) {
    LeadAggregate(where: {
      createdAt: {_gte: $startOfYear},
      sourceApp: {_eq: $sourceApp}
    }) {
      aggregate {
        count
      }
    }
  }
`;

export const useLeadStatisticsQueries = (context: UseLeadStatisticsQueriesProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { sourceApp } = context;

  const fetchRecentLeads = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_RECENT_LEADS_COUNT, { twoWeeksAgo, sourceApp });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching recent leads count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchHotLeads = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_HOT_LEADS_COUNT, { sourceApp });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching hot leads count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchMostCommonLeadSource = useCallback(async (): Promise<string> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        Lead: Array<{ 
          leadSource: { value: string; code: string } | null;
          leadSourceRef: string | null;
        }>
      }>(GET_MOST_COMMON_LEAD_SOURCE, { twoWeeksAgo, sourceApp });

      // Count occurrences of each lead source
      const sourceCounts: Record<string, number> = {};
      result.Lead.forEach(lead => {
        const source = lead.leadSource?.value;
        if (source) {
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
      });

      // Find the most common source
      let mostCommon = 'N/A';
      let maxCount = 0;
      Object.entries(sourceCounts).forEach(([source, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = source;
        }
      });

      return mostCommon;
    } catch (error) {
      console.error('Error fetching most common lead source:', error);
      return 'N/A';
    }
  }, [graphqlClient, sourceApp]);

  const fetchMostCommonIndustry = useCallback(async (): Promise<string> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        Lead: Array<{ 
          industry: { value: string; code: string } | null;
          industryRef: string | null;
        }>
      }>(GET_MOST_COMMON_INDUSTRY, { twoWeeksAgo, sourceApp });

      // Count occurrences of each industry
      const industryCounts: Record<string, number> = {};
      result.Lead.forEach(lead => {
        const industry = lead.industry?.value;
        if (industry) {
          industryCounts[industry] = (industryCounts[industry] || 0) + 1;
        }
      });

      // Find the most common industry
      let mostCommon = 'N/A';
      let maxCount = 0;
      Object.entries(industryCounts).forEach(([industry, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = industry;
        }
      });

      return mostCommon;
    } catch (error) {
      console.error('Error fetching most common industry:', error);
      return 'N/A';
    }
  }, [graphqlClient, sourceApp]);

  const fetchConvertedLeadsThisYear = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_CONVERTED_LEADS_THIS_YEAR_COUNT, { startOfYear, sourceApp });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching converted leads this year count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchTotalLeadsThisYear = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_TOTAL_LEADS_THIS_YEAR_COUNT, { startOfYear, sourceApp });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching total leads this year count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  return {
    fetchRecentLeads,
    fetchHotLeads,
    fetchMostCommonLeadSource,
    fetchMostCommonIndustry,
    fetchConvertedLeadsThisYear,
    fetchTotalLeadsThisYear
  };
}; 