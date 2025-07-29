import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface UseLeadStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp?: string;
}

interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

interface ConversionTrendData extends TrendData {
  currentRate: number;
  previousRate: number;
  currentTotal: number;
  previousTotal: number;
}

// Text-based queries (keep these as they don't have trend versions)

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



// Enhanced queries that fetch both current and previous period data for trend calculations

// Query to get recent leads with trend (current 2 weeks vs previous 2 weeks)
export const GET_RECENT_LEADS_WITH_TREND = `
  query GetRecentLeadsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!, $sourceApp: String) {
    current: LeadAggregate(where: {
      createdAt: {_gte: $currentStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: LeadAggregate(where: {
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

// Query to get hot leads with trend (current vs last month)
export const GET_HOT_LEADS_WITH_TREND = `
  query GetHotLeadsWithTrend($lastMonth: timestamptz!, $sourceApp: String) {
    current: LeadAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      leadRating: {code: {_eq: "HOT"}}
    }) {
      aggregate {
        count
      }
    }
    previous: LeadAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      leadRating: {code: {_eq: "HOT"}},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get conversion rate with trend (this year vs last year)
export const GET_CONVERSION_RATE_WITH_TREND = `
  query GetConversionRateWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!, $sourceApp: String) {
    currentTotal: LeadAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    currentConverted: LeadAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      leadStatus: {code: {_eq: "CONVERTED"}}
    }) {
      aggregate {
        count
      }
    }
    previousTotal: LeadAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previousConverted: LeadAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      leadStatus: {code: {_eq: "CONVERTED"}}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Keep existing queries for backward compatibility

export const useLeadStatisticsQueries = (context: UseLeadStatisticsQueriesProps) => {
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

  const calculateConversionTrend = (currentTotal: number, currentConverted: number, previousTotal: number, previousConverted: number): ConversionTrendData => {
    const currentRate = currentTotal > 0 ? (currentConverted / currentTotal) * 100 : 0;
    const previousRate = previousTotal > 0 ? (previousConverted / previousTotal) * 100 : 0;
    const change = currentRate - previousRate;
    const changePercent = previousRate > 0 ? (change / previousRate) * 100 : (currentRate > 0 ? 100 : 0);
    
    return {
      current: currentConverted,
      previous: previousConverted,
      change: currentConverted - previousConverted,
      changePercent,
      isPositive: change >= 0,
      currentRate,
      previousRate,
      currentTotal,
      previousTotal
    };
  };

  // Enhanced methods with trend data
  const fetchRecentLeadsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const currentStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const previousEnd = currentStart;
      const previousStart = new Date(currentStart.getTime() - (14 * 24 * 60 * 60 * 1000));
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_RECENT_LEADS_WITH_TREND, { 
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
      console.error('Error fetching recent leads with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchHotLeadsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } };
        previous: { aggregate: { count: number } };
      }>(GET_HOT_LEADS_WITH_TREND, { 
        lastMonth: lastMonth.toISOString(),
        sourceApp 
      });
      
      return calculateTrend(
        result.current.aggregate.count,
        result.previous.aggregate.count
      );
    } catch (error) {
      console.error('Error fetching hot leads with trend:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchConversionRateWithTrend = useCallback(async (): Promise<ConversionTrendData> => {
    try {
      const now = new Date();
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      const result = await graphqlClient.request<{
        currentTotal: { aggregate: { count: number } };
        currentConverted: { aggregate: { count: number } };
        previousTotal: { aggregate: { count: number } };
        previousConverted: { aggregate: { count: number } };
      }>(GET_CONVERSION_RATE_WITH_TREND, { 
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        sourceApp 
      });
      
      return calculateConversionTrend(
        result.currentTotal.aggregate.count,
        result.currentConverted.aggregate.count,
        result.previousTotal.aggregate.count,
        result.previousConverted.aggregate.count
      );
    } catch (error) {
      console.error('Error fetching conversion rate with trend:', error);
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



  return {
    // Enhanced methods with trend data
    fetchRecentLeadsWithTrend,
    fetchHotLeadsWithTrend,
    fetchConversionRateWithTrend,
    // Text-based queries (no trend versions needed)
    fetchMostCommonLeadSource,
    fetchMostCommonIndustry
  };
}; 