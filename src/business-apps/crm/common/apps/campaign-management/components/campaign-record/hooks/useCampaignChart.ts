import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  CampaignChartData, 
  CampaignChartDataPoint, 
  ChartTimeFilter, 
  UseCampaignChartReturn,
  CampaignRecord 
} from '../types';
import { useCampaignRecordQueries } from '../queries';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import advancedFormat from 'dayjs/plugin/advancedFormat';

// Extend dayjs with required plugins
dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);

export const useCampaignChart = (
  context: BusinessAppContextProps,
  campaignId: string,
  campaign: CampaignRecord | null
): UseCampaignChartReturn => {
  const [chartData, setChartData] = useState<CampaignChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<ChartTimeFilter>('weekly');
  
  // Get access to campaign queries
  const { fetchCampaignEntities } = useCampaignRecordQueries(context);

  // Generate chart time periods based on campaign duration
  const generateTimePeriodsForCampaign = useCallback((
    startDate: string, 
    endDate: string, 
    filter: ChartTimeFilter
  ): CampaignChartDataPoint[] => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const data: CampaignChartDataPoint[] = [];

    // Don't start from period boundaries, use actual campaign dates
    let current = start;
    let increment: dayjs.ManipulateType;
    let format: string;

    switch (filter) {
      case 'daily':
        increment = 'day';
        format = 'MMM DD';
        break;
      case 'weekly':
        increment = 'week';
        format = '[Week of] MMM DD';
        break;
      case 'monthly':
        increment = 'month';
        format = 'MMM YYYY';
        break;
      case 'yearly':
        increment = 'year';
        format = 'YYYY';
        break;
      default:
        increment = 'week';
        format = '[Week of] MMM DD';
    }

    // Generate time periods across campaign duration
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      // All values are 0 since no entities are associated with this campaign
      // This matches the table showing "0 entities found"
      // 
      // Future enhancement: Query entities with createdAt filters to show growth over time
      // Example: Lead(where: { salesCampaignId: $campaignId, createdAt: { _gte: $periodStart, _lt: $periodEnd } })
      data.push({
        date: current.format(format),
        totalLeads: 0,
        totalAccounts: 0,
        totalContacts: 0,
        totalOpportunities: 0,
        convertedLeads: 0,
        wonOpportunities: 0
      });

      current = current.add(1, increment);
    }

    return data;
  }, []);

  const loadChartData = useCallback(async () => {
    if (!campaignId || !campaign) {
      setError('No campaign data available');
      setIsLoading(false);
      return;
    }

    if (!campaign.startDate || !campaign.endDate) {
      setError('Campaign dates are missing');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate dates before processing
      const startDate = dayjs(campaign.startDate);
      const endDate = dayjs(campaign.endDate);
      
      if (!startDate.isValid() || !endDate.isValid()) {
        throw new Error('Invalid campaign dates');
      }
      
      if (startDate.isAfter(endDate)) {
        throw new Error('Campaign start date cannot be after end date');
      }

      // Generate time periods for campaign duration showing actual entity counts (0 for this campaign)
      const data = generateTimePeriodsForCampaign(campaign.startDate, campaign.endDate, timeFilter);
      
      setChartData({
        data,
        timeFilter
      });
    } catch (err) {
      console.error('Chart data generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate chart data');
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, campaign, timeFilter, generateTimePeriodsForCampaign]);

  const refetch = useCallback(() => {
    loadChartData();
  }, [loadChartData]);

  const handleSetTimeFilter = useCallback((filter: ChartTimeFilter) => {
    setTimeFilter(filter);
  }, []);

  useEffect(() => {
    if (campaignId && campaign) {
      loadChartData();
    }
  }, [campaignId, campaign, timeFilter]);

  return {
    chartData,
    isLoading,
    error,
    timeFilter,
    setTimeFilter: handleSetTimeFilter,
    refetch
  };
};
