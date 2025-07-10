import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { OpportunityStatisticsData, UseOpportunityStatisticsReturn } from '../types';

interface UseOpportunityStatisticsProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const useOpportunityStatistics = (props: UseOpportunityStatisticsProps): UseOpportunityStatisticsReturn => {
  const [statistics, setStatistics] = useState<OpportunityStatisticsData>({
    recentOpportunities: 0,
    totalOpportunityValue: 0,
    averageWinRate: 0,
    totalOpportunitiesThisYear: 0,
    mostCommonStage: 'N/A',
    mostCommonPipeline: 'N/A'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!props.accessToken) {
      console.warn('No access token provided for opportunity statistics loading');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock statistics data - will be replaced with actual GraphQL queries
      const mockStatistics: OpportunityStatisticsData = {
        recentOpportunities: props.sourceApp === 'CRM' ? 18 : 4,
        totalOpportunityValue: props.sourceApp === 'CRM' ? 2450000 : 890000,
        averageWinRate: props.sourceApp === 'CRM' ? 68 : 72,
        totalOpportunitiesThisYear: props.sourceApp === 'CRM' ? 89 : 17,
        mostCommonStage: 'Proposal',
        mostCommonPipeline: 'Standard Sales'
      };

      setStatistics(mockStatistics);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load opportunity statistics'));
    } finally {
      setIsLoading(false);
    }
  }, [props.accessToken, props.sourceApp]);

  return {
    statistics,
    isLoading,
    error,
    refetch
  };
}; 