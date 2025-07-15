import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ContactStatisticsData, UseContactStatisticsReturn } from '../types';

interface UseContactStatisticsProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const useContactStatistics = (props: UseContactStatisticsProps): UseContactStatisticsReturn => {
  const [statistics, setStatistics] = useState<ContactStatisticsData>({
    recentContacts: 0,
    activeContacts: 0,
    totalEmailEngagements: 0,
    totalContactsThisYear: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!props.accessToken) {
      console.warn('No access token provided for contact statistics loading');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock statistics data - will be replaced with actual GraphQL queries
      const mockStatistics: ContactStatisticsData = {
        recentContacts: props.sourceApp === 'CRM' ? 12 : 3,
        activeContacts: props.sourceApp === 'CRM' ? 78 : 9,
        totalEmailEngagements: props.sourceApp === 'CRM' ? 65 : 7,
        totalContactsThisYear: props.sourceApp === 'CRM' ? 34 : 5
      };

      setStatistics(mockStatistics);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load contact statistics'));
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