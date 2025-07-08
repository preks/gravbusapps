import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface LeadStatisticsData {
  recentLeads: number;
  hotLeads: number;
  thisMonthLeads: number;
  convertedLeadsThisYear: number;
  conversionRateThisYear: number;
  totalLeadsThisYear: number;
}

// Query to get recent leads count (past two weeks)
export const GET_RECENT_LEADS_COUNT = `
  query GetRecentLeadsCount($twoWeeksAgo: timestamptz!) {
    LeadAggregate(where: {createdAt: {_gte: $twoWeeksAgo}}) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get hot leads count (HOT and WARM ratings)
export const GET_HOT_LEADS_COUNT = `
  query GetHotLeadsCount {
    LeadAggregate(where: {leadRatingRef: {_in: ["SalesLeadRating:v1:HOT", "SalesLeadRating:v1:WARM"]}}) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get this month's leads
export const GET_THIS_MONTH_LEADS_COUNT = `
  query GetThisMonthLeadsCount($startOfMonth: timestamptz!) {
    LeadAggregate(where: {createdAt: {_gte: $startOfMonth}}) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get converted leads count for this year
export const GET_CONVERTED_LEADS_THIS_YEAR_COUNT = `
  query GetConvertedLeadsThisYearCount($startOfYear: timestamptz!) {
    LeadAggregate(where: {
      leadStatusRef: {_eq: "SalesLeadStatus:v1:CONVERTED"},
      createdAt: {_gte: $startOfYear}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get total leads count for this year (for conversion rate calculation)
export const GET_TOTAL_LEADS_THIS_YEAR_COUNT = `
  query GetTotalLeadsThisYearCount($startOfYear: timestamptz!) {
    LeadAggregate(where: {createdAt: {_gte: $startOfYear}}) {
      aggregate {
        count
      }
    }
  }
`;

export const useLeadStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchRecentLeads = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_RECENT_LEADS_COUNT, { twoWeeksAgo });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching recent leads count:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchHotLeads = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_HOT_LEADS_COUNT);
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching hot leads count:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchThisMonthLeads = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_THIS_MONTH_LEADS_COUNT, { startOfMonth });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching this month leads count:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchConvertedLeadsThisYear = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_CONVERTED_LEADS_THIS_YEAR_COUNT, { startOfYear });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching converted leads this year count:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchTotalLeadsThisYear = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        LeadAggregate: { aggregate: { count: number } }
      }>(GET_TOTAL_LEADS_THIS_YEAR_COUNT, { startOfYear });
      return result.LeadAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching total leads this year count:', error);
      throw error;
    }
  }, [graphqlClient]);

  return {
    fetchRecentLeads,
    fetchHotLeads,
    fetchThisMonthLeads,
    fetchConvertedLeadsThisYear,
    fetchTotalLeadsThisYear
  };
}; 