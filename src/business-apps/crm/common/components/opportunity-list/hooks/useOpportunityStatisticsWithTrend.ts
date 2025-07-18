import { useState, useCallback, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useOpportunityStatisticsQueries } from '../queries/OpportunityStatisticsQueries';

interface UseOpportunityStatisticsWithTrendProps extends BusinessAppContextProps {
  sourceApp?: string;
}

interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

interface OpportunityStatisticsTrendData {
  recentOpportunities: TrendData;
  opportunityValue: TrendData;
  winRate: TrendData;
  opportunitiesThisYear: TrendData;
}

export interface UseOpportunityStatisticsWithTrendReturn {
  trendData: OpportunityStatisticsTrendData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useOpportunityStatisticsWithTrend = (props: UseOpportunityStatisticsWithTrendProps): UseOpportunityStatisticsWithTrendReturn => {
  const [trendData, setTrendData] = useState<OpportunityStatisticsTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    fetchRecentOpportunitiesWithTrend,
    fetchOpportunityValueWithTrend,
    fetchWinRateWithTrend,
    fetchOpportunitiesThisYearWithTrend
  } = useOpportunityStatisticsQueries({
    accessToken: props.accessToken,
    sourceApp: props.sourceApp || 'CRM'
  });

  const refetch = useCallback(async () => {
    if (!props.accessToken) {
      console.warn('No access token provided for opportunity statistics with trend loading');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all statistics with trend data
      const [recentOpportunitiesTrend, opportunityValueTrend, winRateTrend, opportunitiesThisYearTrend] = await Promise.all([
        fetchRecentOpportunitiesWithTrend(),
        fetchOpportunityValueWithTrend(),
        fetchWinRateWithTrend(),
        fetchOpportunitiesThisYearWithTrend()
      ]);

      setTrendData({
        recentOpportunities: recentOpportunitiesTrend,
        opportunityValue: opportunityValueTrend,
        winRate: winRateTrend,
        opportunitiesThisYear: opportunitiesThisYearTrend
      });
    } catch (err) {
      console.error('Error fetching opportunity statistics with trend:', err);
      setError(err instanceof Error ? err : new Error('Failed to load opportunity statistics with trend'));
    } finally {
      setIsLoading(false);
    }
  }, [props.accessToken, fetchRecentOpportunitiesWithTrend, fetchOpportunityValueWithTrend, fetchWinRateWithTrend, fetchOpportunitiesThisYearWithTrend]);

  // Fetch statistics on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      refetch();
    }
  }, [props.accessToken, refetch]);

  return {
    trendData,
    isLoading,
    error,
    refetch
  };
}; 