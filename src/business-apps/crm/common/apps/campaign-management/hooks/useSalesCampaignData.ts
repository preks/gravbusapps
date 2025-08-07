import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useSalesCampaignQueries } from './useSalesCampaignQueries';
import { SalesCampaignQueryVariables, SalesCampaign, SalesCampaignStatistics } from '../types/SalesCampaignTypes';

export interface UseSalesCampaignDataReturn {
  campaigns: SalesCampaign[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  statistics: SalesCampaignStatistics | null;
  statisticsLoading: boolean;
  statisticsError: string | null;
  refetch: () => void;
  fetchCampaigns: (variables?: SalesCampaignQueryVariables) => Promise<void>;
  processFiltersAndFetch: (
    search: string,
    selectedFilters: string[],
    startDateAfter?: string,
    startDateBefore?: string,
    endDateAfter?: string,
    endDateBefore?: string,
    createdAfter?: string,
    createdBefore?: string
  ) => Promise<void>;
  refetchStatistics: () => void;
}

export const useSalesCampaignData = (context: BusinessAppContextProps): UseSalesCampaignDataReturn => {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState<SalesCampaignStatistics | null>(null);
  const [statisticsLoading, setIsStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);

  const { fetchSalesCampaignsWithCount, fetchSalesCampaignStatistics } = useSalesCampaignQueries({ 
    accessToken: context.accessToken 
  });

  const fetchCampaigns = useCallback(async (variables: SalesCampaignQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSalesCampaignsWithCount(variables);
      setCampaigns(result.SalesCampaign || []);
      setTotalCount(result.SalesCampaignAggregate?.aggregate?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCampaigns([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchSalesCampaignsWithCount]);

  // Process filters and fetch data
  const processFiltersAndFetch = useCallback(async (
    search: string,
    selectedFilters: string[],
    startDateAfter?: string,
    startDateBefore?: string,
    endDateAfter?: string,
    endDateBefore?: string,
    createdAfter?: string,
    createdBefore?: string
  ) => {
    // Extract campaign types from selected filters
    const campaignTypes = selectedFilters.filter(filter => 
      filter.startsWith('TYPE_')
    ).map(filter => filter.replace('TYPE_', ''));

    await fetchCampaigns({
      search,
      campaignTypes: campaignTypes.length > 0 ? campaignTypes : undefined,
      startDateAfter,
      startDateBefore,
      endDateAfter,
      endDateBefore,
      createdAfter,
      createdBefore,
    });
  }, [fetchCampaigns]);

  const fetchStatistics = useCallback(async () => {
    if (!context.accessToken) {
      setStatisticsError('No access token available');
      setIsStatisticsLoading(false);
      return;
    }

    setIsStatisticsLoading(true);
    setStatisticsError(null);

    try {
      const result = await fetchSalesCampaignStatistics();
      
      // Calculate average duration
      let averageDuration = 0;
      if (result.campaignsWithDuration && result.campaignsWithDuration.length > 0) {
        const totalDays = result.campaignsWithDuration.reduce((total, campaign) => {
          const startDate = new Date(campaign.startDate);
          const endDate = new Date(campaign.endDate);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return total + diffDays;
        }, 0);
        averageDuration = Math.round(totalDays / result.campaignsWithDuration.length);
      }
      
      setStatistics({
        totalCampaigns: result.totalCampaigns?.aggregate?.count || 0,
        activeCampaigns: result.activeCampaigns?.aggregate?.count || 0,
        completedCampaigns: result.completedCampaigns?.aggregate?.count || 0,
        averageDuration: averageDuration
      });
    } catch (err) {
      setStatisticsError(err instanceof Error ? err.message : 'Unknown error');
      setStatistics(null);
    } finally {
      setIsStatisticsLoading(false);
    }
  }, [context.accessToken, fetchSalesCampaignStatistics]);

  const refetch = useCallback(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const refetchStatistics = useCallback(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    if (context.accessToken) {
      fetchCampaigns();
      fetchStatistics();
    }
  }, [context.accessToken, fetchCampaigns, fetchStatistics]);

  return {
    campaigns,
    isLoading,
    error,
    totalCount,
    statistics,
    statisticsLoading,
    statisticsError,
    refetch,
    fetchCampaigns,
    processFiltersAndFetch,
    refetchStatistics
  };
}; 