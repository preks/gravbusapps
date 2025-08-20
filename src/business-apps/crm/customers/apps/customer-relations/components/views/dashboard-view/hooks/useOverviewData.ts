import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { useDashboardQueries } from '../queries/DashboardQueries';
import { formatCurrency, extractCurrencyCode } from '../utils/dashboardUtils';

export interface OverviewData {
  aggregatedFunnel: Array<{
    stage: string;
    count: number;
    value: number;
    percentage: number;
    color: string;
  }>;
  revenueBySource: Array<{
    source: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  totalPipelineValue: number;
  totalRevenue: number;
  recentRecords: Array<{
    id: string;
    name: string;
    type: 'opportunity' | 'lead' | 'contact';
    createdAt: string;
  }>;
  keyDeals: Array<{
    id: string;
    name: string;
    value: string;
    stage: string;
    owner: string;
    closeDate: string;
  }>;
  todaysActivities: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    createdAt: string;
    completedAt: string | null;
    owner: string;
    relatedTo: string;
  }>;
  activeTasks: Array<{
    id: string;
    name: string;
    description: string;
    dueDate: string | null;
    status: string;
    priority: string;
    assignedTo: string;
    relatedTo: string;
    isOverdue: boolean;
  }>;
}

export interface UseOverviewDataReturn {
  overviewData: OverviewData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useOverviewData = (
  context: BusinessAppContextProps,
  pipelines: PipelineInfo[],
  dateRange: DateRange
): UseOverviewDataReturn => {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchPipelineOpportunities, fetchRecentLeads, fetchSalesActivities, fetchPipelineStages, fetchTodaysActivities, fetchTodaysTasks, fetchOpenLeadsForRevenueSource } = useDashboardQueries(context);

  const loadOverviewData = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch opportunities from all pipelines in parallel
      const allOpportunitiesPromises = pipelines.map(pipeline =>
        fetchPipelineOpportunities({
          pipelineRef: pipeline.ref,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          limit: 50
        })
      );

      const [opportunityArrays, recentLeads, , todaysActivities, todaysTasks, openLeads] = await Promise.all([
        Promise.all(allOpportunitiesPromises),
        fetchRecentLeads(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          10
        ),
        Promise.resolve([]), // Skip sales activities for now
        fetchTodaysActivities(),
        fetchTodaysTasks(),
        fetchOpenLeadsForRevenueSource({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          limit: 50
        })
      ]);

      // Flatten all opportunities from all pipelines
      const allOpportunities = opportunityArrays.flat();

      // Data loaded successfully

      // Get all pipeline stages for funnel calculation
      const allStages = new Map<string, any>();
      for (const pipeline of pipelines) {
        try {
          const stages = await fetchPipelineStages(pipeline.ref);

          stages.forEach((stage: any) => {
            allStages.set(stage.code, stage);
          });
        } catch (err) {
          // Failed to fetch stages for this pipeline
        }
      }

      // Calculate aggregated funnel data from all opportunities using standardized stages
      const standardizedStageGroups = new Map<string, { count: number; value: number }>();
      let totalPipelineValue = 0;
      let totalRevenue = 0;

      // Define the standardized stage mapping and order
      const stageMapping = {
        'DISCOVERY': 'Discovery',
        'QUALIFICATION': 'Qualification', 
        'NEGOTIATION': 'Negotiation',
        'CLOSED_WON': 'Closed Won',
        'CLOSED_LOST': 'Closed Lost'
      };

      const stageOrder = ['DISCOVERY', 'QUALIFICATION', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
      const stageColors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#f5222d'];

      // Initialize all stages with zero counts
      stageOrder.forEach(stageCode => {
        standardizedStageGroups.set(stageCode, { count: 0, value: 0 });
      });

      allOpportunities.forEach((opp: any) => {
        const amount = opp.estimatedAmount || 0;
        totalPipelineValue += amount;
        
        // Get the alternative code from the pipeline stage
        const alternativeCode = opp.salesPipelineStage?.alternativeCode;
        
        // Determine stage based on alternative code or fallback logic
        let stageCode = 'DISCOVERY'; // Default fallback
        
        if (alternativeCode && stageMapping[alternativeCode as keyof typeof stageMapping]) {
          stageCode = alternativeCode;
        } else if (opp.status === 'Won') {
          stageCode = 'CLOSED_WON';
          totalRevenue += amount;
        } else if (opp.status === 'Lost') {
          stageCode = 'CLOSED_LOST';
        }
        
        const group = standardizedStageGroups.get(stageCode)!;
        group.count += 1;
        group.value += amount;
      });

      // Convert to funnel data in the specified order with human-readable labels
      const totalOpportunities = allOpportunities.length;
      const aggregatedFunnel = stageOrder.map((stageCode, index) => {
        const data = standardizedStageGroups.get(stageCode)!;
        return {
          stage: stageMapping[stageCode as keyof typeof stageMapping],
          count: data.count,
          value: data.value,
          percentage: totalOpportunities > 0 ? Math.round((data.count / totalOpportunities) * 100) : 0,
          color: stageColors[index]
        };
      }).filter(stage => stage.count > 0); // Only show stages with data

      // Funnel data calculated successfully

      // Calculate lead counts by source from open leads
      const sourceGroups = new Map<string, number>();

      openLeads.forEach((lead: any) => {
        const source = lead.leadSource?.value || 'NETWORK';
        sourceGroups.set(source, (sourceGroups.get(source) || 0) + 1);
      });

      // Lead source data calculated successfully

      const totalLeadCount = Array.from(sourceGroups.values()).reduce((sum, count) => sum + count, 0);
      
      // Define colors for different sources
      const sourceColors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#f5222d', '#13c2c2', '#eb2f96'];
      
      const revenueBySource = Array.from(sourceGroups.entries()).map(([source, count], index) => ({
        source,
        value: count, // Now value represents lead count, not revenue
        count: count, // Keep count for backwards compatibility
        percentage: totalLeadCount > 0 ? Math.round((count / totalLeadCount) * 100) : 0,
        color: sourceColors[index % sourceColors.length]
      })).sort((a, b) => b.value - a.value);

      // Create recent records from opportunities and leads
      const recentRecords = [
        ...allOpportunities.slice(0, 3).map((opp: any) => ({
          id: opp.id,
          name: opp.name,
          type: 'opportunity' as const,
          createdAt: opp.createdAt
        })),
        ...recentLeads.slice(0, 2).map((lead: any) => ({
          id: lead.id,
          name: lead.name || `${lead.firstName} ${lead.lastName}`.trim() || lead.companyName || 'Unnamed Lead',
          type: 'lead' as const,
          createdAt: lead.createdAt
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Create key deals from top opportunities
      const keyDeals = allOpportunities
        .filter((opp: any) => opp.estimatedAmount > 0)
        .sort((a: any, b: any) => (b.estimatedAmount || 0) - (a.estimatedAmount || 0))
        .slice(0, 6)
        .map((opp: any) => ({
          id: opp.id,
          name: opp.name,
          value: formatCurrency(opp.estimatedAmount, extractCurrencyCode(opp.currencyRef || 'Currency:v1:EUR')),
          stage: opp.salesPipelineStage?.value || opp.stage || 'Unknown',
          owner: opp.ownerEmployee ? `${opp.ownerEmployee.firstName} ${opp.ownerEmployee.lastName}`.trim() : 'Unassigned',
          closeDate: opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : 'TBD'
        }));

      // Process today's activities
      const processedTodaysActivities = todaysActivities.map((activity: any) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description || '',
        type: activity.activityType?.value || activity.activityTypeRef?.split(':').pop() || 'Unknown',
        createdAt: activity.createdAt,
        completedAt: activity.completedAt,
        owner: activity.ownerEmployee?.fullName || activity.ownerEmployee?.displayName || 
               `${activity.ownerEmployee?.firstName || ''} ${activity.ownerEmployee?.lastName || ''}`.trim() || 'Unassigned',
        relatedTo: activity.opportunity?.name || activity.lead?.name || activity.account?.name || 
                  (activity.contact ? `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim() : '') || 'No relation'
      }));

      // Process active tasks (tasks without end date)
      const processedTodaysTasks = todaysTasks.map((task: any) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const now = new Date();
        const isOverdue = dueDate ? dueDate < now : false;
        
        return {
          id: task.id,
          name: task.name || 'Untitled Task',
          description: task.description || '',
          dueDate: task.dueDate,
          status: task.status?.value || task.statusRef?.split(':').pop() || 'Active',
          priority: task.priority?.value || task.priorityRef?.split(':').pop() || 'Normal',
          assignedTo: task.assignedEmployee?.fullName || task.assignedEmployee?.displayName || 
                     `${task.assignedEmployee?.firstName || ''} ${task.assignedEmployee?.lastName || ''}`.trim() || 
                     (task.creatorEmployee?.fullName || task.creatorEmployee?.displayName || 
                      `${task.creatorEmployee?.firstName || ''} ${task.creatorEmployee?.lastName || ''}`.trim()) || 'Unassigned',
          relatedTo: task.opportunity?.name || task.lead?.name || task.account?.name || 
                    (task.contact ? `${task.contact.firstName || ''} ${task.contact.lastName || ''}`.trim() : '') || 'No relation',
          isOverdue
        };
      });

      const realOverviewData: OverviewData = {
        aggregatedFunnel,
        revenueBySource,
        totalPipelineValue,
        totalRevenue: totalLeadCount, // Use total lead count instead of revenue
        recentRecords,
        keyDeals,
        todaysActivities: processedTodaysActivities,
        activeTasks: processedTodaysTasks
      };

      setOverviewData(realOverviewData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load overview data';
      setError(errorMessage);
      // Error handled by state management
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, pipelines, dateRange, fetchPipelineOpportunities, fetchRecentLeads, fetchSalesActivities, fetchPipelineStages, fetchTodaysActivities, fetchTodaysTasks, fetchOpenLeadsForRevenueSource]);

  const refetch = useCallback(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  return {
    overviewData,
    isLoading,
    error,
    refetch
  };
}; 