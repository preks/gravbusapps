import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useLeadStatisticsQueries, LeadStatisticsData } from '../queries/LeadStatisticsQueries';

export interface UseLeadStatisticsProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const useLeadStatistics = (context: UseLeadStatisticsProps) => {
  const [statistics, setStatistics] = useState<LeadStatisticsData>({
    recentLeads: 0,
    hotLeads: 0,
    mostCommonLeadSource: 'N/A',
    mostCommonIndustry: 'N/A',
    convertedLeadsThisYear: 0,
    conversionRateThisYear: 0,
    totalLeadsThisYear: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchRecentLeads,
    fetchHotLeads,
    fetchMostCommonLeadSource,
    fetchMostCommonIndustry,
    fetchConvertedLeadsThisYear,
    fetchTotalLeadsThisYear
  } = useLeadStatisticsQueries(context);

  const fetchStatistics = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all statistics in parallel
      const [recentLeads, hotLeads, mostCommonLeadSource, mostCommonIndustry, convertedLeadsThisYear, totalLeadsThisYear] = await Promise.all([
        fetchRecentLeads(),
        fetchHotLeads(),
        fetchMostCommonLeadSource(),
        fetchMostCommonIndustry(),
        fetchConvertedLeadsThisYear(),
        fetchTotalLeadsThisYear()
      ]);

      // Calculate yearly conversion rate
      const conversionRateThisYear = totalLeadsThisYear > 0 ? (convertedLeadsThisYear / totalLeadsThisYear) * 100 : 0;

      setStatistics({
        recentLeads,
        hotLeads,
        mostCommonLeadSource,
        mostCommonIndustry,
        convertedLeadsThisYear,
        conversionRateThisYear,
        totalLeadsThisYear
      });
    } catch (err) {
      console.error('Error fetching lead statistics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching statistics');
    } finally {
      setIsLoading(false);
    }
  }, [
    context.accessToken,
    fetchRecentLeads,
    fetchHotLeads,
    fetchMostCommonLeadSource,
    fetchMostCommonIndustry,
    fetchConvertedLeadsThisYear,
    fetchTotalLeadsThisYear
  ]);

  // Fetch statistics on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      fetchStatistics();
    }
  }, [context.accessToken, fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  };
}; 