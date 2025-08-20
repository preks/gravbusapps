import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCampaignRecordQueries } from '../queries';
import { 
  CampaignKPIs, 
  CampaignKPIWithTrend, 
  CampaignKPITrend, 
  UseCampaignKPIsReturn 
} from '../types';

export const useCampaignKPIs = (
  context: BusinessAppContextProps,
  campaignId: string
): UseCampaignKPIsReturn => {
  const [kpis, setKpis] = useState<CampaignKPIs | null>(null);
  const [kpisWithTrends, setKpisWithTrends] = useState<{
    totalLeads: CampaignKPIWithTrend;
    totalAccounts: CampaignKPIWithTrend;
    totalContacts: CampaignKPIWithTrend;
    totalOpportunities: CampaignKPIWithTrend;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchCampaignKPIs } = useCampaignRecordQueries(context);

  // Helper function to generate mock trend data (similar to campaign list statistics)
  const generateTrendData = (currentValue: number, metric: string): CampaignKPITrend => {
    // Simulate trend data - in reality, this would be calculated from historical data
    const mockPreviousValues = {
      totalLeads: Math.max(0, currentValue - Math.floor(Math.random() * 5)),
      totalAccounts: Math.max(0, currentValue - Math.floor(Math.random() * 3)),
      totalContacts: Math.max(0, currentValue - Math.floor(Math.random() * 4)),
      totalOpportunities: Math.max(0, currentValue - Math.floor(Math.random() * 3))
    };
    
    const previousValue = mockPreviousValues[metric as keyof typeof mockPreviousValues] || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;
    
    return {
      value: `${change > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      positive: change > 0,
      description: 'vs last period'
    };
  };

  const loadCampaignKPIs = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setError('No access token or campaign ID available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCampaignKPIs({ campaignId });
      
      const totalLeads = result.totalLeads?.aggregate?.count || 0;
      const convertedLeads = result.convertedLeads?.aggregate?.count || 0;
      const totalAccounts = result.totalAccounts?.aggregate?.count || 0;
      const totalContacts = result.totalContacts?.aggregate?.count || 0;
      const totalOpportunities = result.totalOpportunities?.aggregate?.count || 0;
      const wonOpportunities = result.wonOpportunities?.aggregate?.count || 0;

      const convertedLeadsPercentage = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      const wonOpportunitiesPercentage = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;

      const kpisData: CampaignKPIs = {
        totalLeads,
        convertedLeads,
        convertedLeadsPercentage,
        totalAccounts,
        totalContacts,
        totalOpportunities,
        wonOpportunities,
        wonOpportunitiesPercentage
      };

      const kpisWithTrendsData = {
        totalLeads: {
          current: totalLeads,
          percentage: convertedLeadsPercentage,
          trend: generateTrendData(totalLeads, 'totalLeads')
        },
        totalAccounts: {
          current: totalAccounts,
          trend: generateTrendData(totalAccounts, 'totalAccounts')
        },
        totalContacts: {
          current: totalContacts,
          trend: generateTrendData(totalContacts, 'totalContacts')
        },
        totalOpportunities: {
          current: totalOpportunities,
          percentage: wonOpportunitiesPercentage,
          trend: generateTrendData(totalOpportunities, 'totalOpportunities')
        }
      };

      setKpis(kpisData);
      setKpisWithTrends(kpisWithTrendsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setKpis(null);
      setKpisWithTrends(null);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, campaignId, fetchCampaignKPIs]);

  const refetch = useCallback(() => {
    loadCampaignKPIs();
  }, [loadCampaignKPIs]);

  useEffect(() => {
    if (context.accessToken && campaignId) {
      loadCampaignKPIs();
    }
  }, [context.accessToken, campaignId]);

  return {
    kpis,
    kpisWithTrends,
    isLoading,
    error,
    refetch
  };
};
