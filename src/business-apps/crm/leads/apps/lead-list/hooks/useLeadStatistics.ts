import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useLeadStatisticsQueries, LeadStatisticsData } from '../queries/LeadStatisticsQueries';

export const useLeadStatistics = (context: BusinessAppContextProps) => {
  const [statistics, setStatistics] = useState<LeadStatisticsData>({
    recentLeads: 0,
    hotLeads: 0,
    thisMonthLeads: 0,
    convertedLeadsThisYear: 0,
    conversionRateThisYear: 0,
    totalLeadsThisYear: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchRecentLeads,
    fetchHotLeads,
    fetchThisMonthLeads,
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
      const [recentLeads, hotLeads, thisMonthLeads, convertedLeadsThisYear, totalLeadsThisYear] = await Promise.all([
        fetchRecentLeads(),
        fetchHotLeads(),
        fetchThisMonthLeads(),
        fetchConvertedLeadsThisYear(),
        fetchTotalLeadsThisYear()
      ]);

      // Calculate yearly conversion rate
      const conversionRateThisYear = totalLeadsThisYear > 0 ? (convertedLeadsThisYear / totalLeadsThisYear) * 100 : 0;

      setStatistics({
        recentLeads,
        hotLeads,
        thisMonthLeads,
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
    fetchThisMonthLeads,
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