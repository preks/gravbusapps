import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange, PipelineData } from '../types/dashboardTypes';
import { useDashboardQueries } from '../queries/DashboardQueries';
import { transformPipelineData } from '../utils/dashboardUtils';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

export interface UsePipelineDataReturn {
  pipelineData: PipelineData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePipelineData = (
  context: BusinessAppContextProps,
  pipeline: PipelineInfo,
  dateRange: DateRange
): UsePipelineDataReturn => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchPipelineStages,
    fetchPipelineOpportunities,
    fetchSalesActivities,
    fetchWinRateData,
    fetchSalesRepPerformance
  } = useDashboardQueries(context);

  const loadPipelineData = useCallback(async () => {
    if (!context.accessToken || !pipeline.ref) {
      setError('Missing access token or pipeline reference');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extend dayjs with quarter plugin
      dayjs.extend(quarterOfYear);
      
      const startDate = dayjs(dateRange.startDate).toISOString();
      const endDate = dayjs(dateRange.endDate).toISOString();
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss');
      const quarterStart = dayjs().startOf('quarter').format('YYYY-MM-DDTHH:mm:ss');

      // Fetch all data in parallel
      const [
        stages,
        opportunities,
        activities,
        winRateData,
        salesRepData
      ] = await Promise.all([
        fetchPipelineStages(pipeline.ref),
        fetchPipelineOpportunities({
          pipelineRef: pipeline.ref,
          startDate,
          endDate,
          limit: 50
        }),
        fetchSalesActivities({
          startDate,
          endDate,
          pipelineRef: pipeline.ref
        }),
        fetchWinRateData({
          pipelineRef: pipeline.ref,
          monthStart,
          quarterStart,
          endDate: dayjs(dateRange.endDate).format('YYYY-MM-DDTHH:mm:ss')
        }),
        fetchSalesRepPerformance({
          pipelineRef: pipeline.ref,
          startDate: dayjs(dateRange.startDate).format('YYYY-MM-DDTHH:mm:ss'),
          endDate: dayjs(dateRange.endDate).format('YYYY-MM-DDTHH:mm:ss'),
          activityStartDate: startDate,
          activityEndDate: endDate
        })
      ]);

      // Transform the data
      const transformedData = transformPipelineData(
        {
          id: pipeline.id,
          name: pipeline.name,
          code: pipeline.ref,
          description: pipeline.description,
          additionalProperties: { color: pipeline.color }
        },
        opportunities,
        activities,
        stages
      );

      // Enhance with win rate and sales rep data
      const enhancedData: PipelineData = {
        ...transformedData,
        winRateMetrics: {
          monthToDate: {
            won: winRateData.monthOpportunities.filter((opp: any) => (opp.opportunityStatus?.code === 'WON') || opp.status === 'Won').length,
            lost: winRateData.monthOpportunities.filter((opp: any) => (opp.opportunityStatus?.code === 'LOST') || opp.status === 'Lost').length,
            winRate: (() => {
              const won = winRateData.monthOpportunities.filter((opp: any) => (opp.opportunityStatus?.code === 'WON') || opp.status === 'Won').length;
              const total = winRateData.monthOpportunities.length;
              return total > 0 ? (won / total) * 100 : 0;
            })()
          },
          quarterToDate: {
            won: winRateData.quarterOpportunities.filter((opp: any) => (opp.opportunityStatus?.code === 'WON') || opp.status === 'Won').length,
            lost: winRateData.quarterOpportunities.filter((opp: any) => (opp.opportunityStatus?.code === 'LOST') || opp.status === 'Lost').length,
            winRate: (() => {
              const won = winRateData.quarterOpportunities.filter((opp: any) => (opp.opportunityStatus?.code === 'WON') || opp.status === 'Won').length;
              const total = winRateData.quarterOpportunities.length;
              return total > 0 ? (won / total) * 100 : 0;
            })()
          }
        },
        leaderboard: (() => {
          const repMap = new Map<string, any>();

          // Process opportunities for leaderboard
          salesRepData.opportunities.forEach((opp: any) => {
            const empId = opp.ownerEmployeeId;
            if (!empId) return;

            if (!repMap.has(empId)) {
              repMap.set(empId, {
                employeeId: empId,
                firstName: opp.ownerEmployee?.firstName || '',
                lastName: opp.ownerEmployee?.lastName || '',
                displayName: `${opp.ownerEmployee?.firstName || ''} ${opp.ownerEmployee?.lastName || ''}`.trim(),
                dealsWon: 0,
                dealsLost: 0,
                totalValue: 0,
                winRate: 0,
                activitiesCount: 0
              });
            }

            const rep = repMap.get(empId);
            if ((opp.opportunityStatus?.code === 'WON') || opp.status === 'Won') {
              rep.dealsWon++;
              rep.totalValue += opp.estimatedAmount || 0;
            } else if ((opp.opportunityStatus?.code === 'LOST') || opp.status === 'Lost') {
              rep.dealsLost++;
            }
          });

          // Process activities for leaderboard
          salesRepData.activities.forEach((activity: any) => {
            const empId = activity.ownerEmployeeId;
            if (!empId) return;

            if (repMap.has(empId)) {
              const rep = repMap.get(empId);
              rep.activitiesCount++;
            }
          });

          // Calculate win rates and sort
          const leaderboard = Array.from(repMap.values()).map((rep: any) => ({
            ...rep,
            winRate: rep.dealsWon + rep.dealsLost > 0 
              ? (rep.dealsWon / (rep.dealsWon + rep.dealsLost)) * 100 
              : 0
          }));

          return leaderboard.sort((a: any, b: any) => b.totalValue - a.totalValue);
        })()
      };

      setPipelineData(enhancedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pipeline data';
      setError(errorMessage);
      // Error handled by state management
    } finally {
      setIsLoading(false);
    }
  }, [
    context.accessToken,
    pipeline.ref,
    pipeline.id,
    pipeline.name,
    pipeline.description,
    pipeline.color,
    dateRange.startDate,
    dateRange.endDate,
    fetchPipelineStages,
    fetchPipelineOpportunities,
    fetchSalesActivities,
    fetchWinRateData,
    fetchSalesRepPerformance
  ]);

  const refetch = useCallback(() => {
    loadPipelineData();
  }, [loadPipelineData]);

  useEffect(() => {
    loadPipelineData();
  }, [loadPipelineData]);

  return {
    pipelineData,
    isLoading,
    error,
    refetch
  };
};
