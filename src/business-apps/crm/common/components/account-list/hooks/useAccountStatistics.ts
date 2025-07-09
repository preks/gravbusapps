import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAccountStatisticsQueries, AccountStatisticsData } from '../queries/AccountStatisticsQueries';

export interface UseAccountStatisticsProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const useAccountStatistics = (context: UseAccountStatisticsProps) => {
  const [statistics, setStatistics] = useState<AccountStatisticsData>({
    recentAccounts: 0,
    activeAccounts: 0,
    mostCommonIndustry: 'N/A',
    mostCommonLegalForm: 'N/A',
    totalAccountsThisYear: 0,
    totalRevenue: 0,
    averageEmployees: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    fetchRecentAccounts,
    fetchActiveAccounts,
    fetchMostCommonIndustry,
    fetchMostCommonLegalForm,
    fetchTotalAccountsThisYear,
    fetchTotalRevenueEstimate
  } = useAccountStatisticsQueries(context);

  const fetchStatistics = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('No access token available'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all statistics in parallel
      const [recentAccounts, activeAccounts, mostCommonIndustry, mostCommonLegalForm, totalAccountsThisYear, totalRevenue] = await Promise.all([
        fetchRecentAccounts(),
        fetchActiveAccounts(),
        fetchMostCommonIndustry(),
        fetchMostCommonLegalForm(),
        fetchTotalAccountsThisYear(),
        fetchTotalRevenueEstimate()
      ]);

      setStatistics({
        recentAccounts,
        activeAccounts,
        mostCommonIndustry,
        mostCommonLegalForm,
        totalAccountsThisYear,
        totalRevenue,
        averageEmployees: 0 // TODO: Calculate average employees if needed
      });
    } catch (err) {
      console.error('Error fetching account statistics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching statistics'));
    } finally {
      setIsLoading(false);
    }
  }, [
    context.accessToken,
    fetchRecentAccounts,
    fetchActiveAccounts,
    fetchMostCommonIndustry,
    fetchMostCommonLegalForm,
    fetchTotalAccountsThisYear,
    fetchTotalRevenueEstimate
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