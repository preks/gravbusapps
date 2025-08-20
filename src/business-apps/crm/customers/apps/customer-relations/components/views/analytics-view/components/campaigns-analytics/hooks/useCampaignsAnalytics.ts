import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCampaignsAnalyticsQueries } from '../queries/CampaignsAnalyticsQueries';
import {
  CampaignsAnalyticsData,
  CampaignsAnalyticsMetrics,
  CampaignPerformanceComparison,
  CampaignsTimelineData,
  TopPerformingCampaign,
  TopPerformingEmployee,
} from '../types/CampaignsAnalyticsTypes';

// Extend dayjs with required plugins
dayjs.extend(weekday);
dayjs.extend(advancedFormat);

// Note: Campaign type is now fetched directly from the type.value field in GraphQL

// Helper function to get campaign status
const getCampaignStatus = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return 'Unknown';
  const now = dayjs();
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (now.isBefore(start)) return 'Upcoming';
  if (now.isAfter(end)) return 'Completed';
  return 'Active';
};

// Helper function to calculate conversion rate
const calculateConversionRate = (converted: number, total: number): number => {
  return total > 0 ? (converted / total) * 100 : 0;
};

// Helper function to calculate win rate
const calculateWinRate = (won: number, total: number): number => {
  return total > 0 ? (won / total) * 100 : 0;
};

// Helper function to calculate campaign duration in days
const calculateDuration = (startDate: string, endDate: string): number => {
  return dayjs(endDate).diff(dayjs(startDate), 'day');
};

export const useCampaignsAnalytics = (context: BusinessAppContextProps) => {
  const [analyticsData, setAnalyticsData] = useState<CampaignsAnalyticsData>({
    metrics: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      upcomingCampaigns: 0,
      completedCampaigns: 0,
      totalLeads: 0,
      totalAccounts: 0,
      totalContacts: 0,
      totalOpportunities: 0,
      totalRevenue: 0,
      averageConversionRate: 0,
      averageWinRate: 0,
      averageCampaignDuration: 0,
    },
    campaignComparisons: [],
    timelineAnalysis: [],
    topCampaigns: [],
    topEmployees: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    fetchTopPerformingEmployees,
  } = useCampaignsAnalyticsQueries(context);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [
        metricsResponse,
        performanceResponse,
        timelineResponse,
        topCampaignsResponse,
        topEmployeesResponse
      ] = await Promise.all([
        fetchCampaignsAnalyticsMetrics(),
        fetchCampaignsPerformanceComparison(),
        fetchCampaignsTimelineAnalysis(),
        fetchTopPerformingCampaigns(),
        fetchTopPerformingEmployees()
      ]);

      // Transform metrics data - aggregate from actual campaign entity counts
      let totalLeads = 0;
      let totalAccounts = 0;
      let totalContacts = 0;
      let totalOpportunities = 0;
      let totalRevenue = 0;
      let totalWonOpportunities = 0;

      // Aggregate actual entity counts from all campaigns
      metricsResponse.campaigns.forEach(campaign => {
        totalLeads += campaign.leadAggregate.aggregate.count;
        totalAccounts += campaign.accountAggregate.aggregate.count;
        totalContacts += campaign.contactAggregate.aggregate.count;
        totalOpportunities += campaign.opportunityAggregate.aggregate.count;
        totalWonOpportunities += campaign.wonOpportunityAggregate.aggregate.count;
        totalRevenue += campaign.wonOpportunityAggregate.aggregate.sum.estimatedAmount || 0;
      });

      const metrics: CampaignsAnalyticsMetrics = {
        totalCampaigns: metricsResponse.totalCampaigns.aggregate.count,
        activeCampaigns: metricsResponse.activeCampaigns.aggregate.count,
        upcomingCampaigns: metricsResponse.upcomingCampaigns.aggregate.count,
        completedCampaigns: metricsResponse.completedCampaigns.aggregate.count,
        totalLeads,
        totalAccounts,
        totalContacts,
        totalOpportunities,
        totalRevenue,
        averageConversionRate: calculateConversionRate(totalAccounts, totalLeads),
        averageWinRate: calculateWinRate(totalWonOpportunities, totalOpportunities),
        averageCampaignDuration: 0, // Will be calculated from performance data
      };

      // Transform campaign performance comparison data
      const campaignComparisons: CampaignPerformanceComparison[] = performanceResponse.campaigns.map(campaign => {
        const leadsCount = campaign.leadAggregate.aggregate.count;
        const accountsCount = campaign.accountAggregate.aggregate.count;
        const contactsCount = campaign.contactAggregate.aggregate.count;
        const opportunitiesCount = campaign.opportunityAggregate.aggregate.count;
        const wonOpportunitiesCount = campaign.wonOpportunityAggregate.aggregate.count;
        const totalRevenue = campaign.revenueAggregate.aggregate.sum.estimatedAmount || 0;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: getCampaignStatus(campaign.startDate, campaign.endDate),
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          leadsCount,
          accountsCount,
          contactsCount,
          opportunitiesCount,
          wonOpportunitiesCount,
          totalRevenue,
          conversionRate: calculateConversionRate(accountsCount, leadsCount),
          winRate: calculateWinRate(wonOpportunitiesCount, opportunitiesCount),
          duration: calculateDuration(campaign.startDate, campaign.endDate),
        };
      });

      // Calculate average campaign duration from campaign comparisons
      // Note: Keep the overall averageWinRate and averageConversionRate from the aggregated totals above
      if (campaignComparisons.length > 0) {
        metrics.averageCampaignDuration = campaignComparisons.reduce((sum, campaign) => sum + campaign.duration, 0) / campaignComparisons.length;
      }

      // Transform timeline analysis data
      const timelineAnalysis: CampaignsTimelineData[] = [];
      const dailyData = new Map<string, {
        campaignsCreated: number;
        leadsGenerated: number;
        accountsCreated: number;
        contactsCreated: number;
        opportunitiesCreated: number;
        dailyRevenue: number;
      }>();

      // Process campaigns and their entities by creation date
      timelineResponse.campaigns.forEach(campaign => {
        const campaignDate = dayjs(campaign.createdAt).format('YYYY-MM-DD');
        if (!dailyData.has(campaignDate)) {
          dailyData.set(campaignDate, {
            campaignsCreated: 0,
            leadsGenerated: 0,
            accountsCreated: 0,
            contactsCreated: 0,
            opportunitiesCreated: 0,
            dailyRevenue: 0,
          });
        }

        const dayData = dailyData.get(campaignDate)!;
        dayData.campaignsCreated += 1;

        // Process entities by creation date
        // Only count entities that are actually assigned to this campaign
        campaign.lead.forEach(lead => {
          // Note: leads from the timeline query are campaign-specific, so they should be valid
          const leadDate = dayjs(lead.createdAt).format('YYYY-MM-DD');
          if (!dailyData.has(leadDate)) {
            dailyData.set(leadDate, {
              campaignsCreated: 0,
              leadsGenerated: 0,
              accountsCreated: 0,
              contactsCreated: 0,
              opportunitiesCreated: 0,
              dailyRevenue: 0,
            });
          }
          dailyData.get(leadDate)!.leadsGenerated += 1;
        });

        campaign.account.forEach(account => {
          const accountDate = dayjs(account.createdAt).format('YYYY-MM-DD');
          if (!dailyData.has(accountDate)) {
            dailyData.set(accountDate, {
              campaignsCreated: 0,
              leadsGenerated: 0,
              accountsCreated: 0,
              contactsCreated: 0,
              opportunitiesCreated: 0,
              dailyRevenue: 0,
            });
          }
          dailyData.get(accountDate)!.accountsCreated += 1;
        });

        campaign.contact.forEach(contact => {
          const contactDate = dayjs(contact.createdAt).format('YYYY-MM-DD');
          if (!dailyData.has(contactDate)) {
            dailyData.set(contactDate, {
              campaignsCreated: 0,
              leadsGenerated: 0,
              accountsCreated: 0,
              contactsCreated: 0,
              opportunitiesCreated: 0,
              dailyRevenue: 0,
            });
          }
          dailyData.get(contactDate)!.contactsCreated += 1;
        });

        campaign.opportunity.forEach(opportunity => {
          const opportunityDate = dayjs(opportunity.createdAt).format('YYYY-MM-DD');
          if (!dailyData.has(opportunityDate)) {
            dailyData.set(opportunityDate, {
              campaignsCreated: 0,
              leadsGenerated: 0,
              accountsCreated: 0,
              contactsCreated: 0,
              opportunitiesCreated: 0,
              dailyRevenue: 0,
            });
          }
          const dayOpportunityData = dailyData.get(opportunityDate)!;
          dayOpportunityData.opportunitiesCreated += 1;
          
          // Add revenue for won opportunities
          if (opportunity.opportunityStatus?.value === 'Won') {
            dayOpportunityData.dailyRevenue += opportunity.estimatedAmount || 0;
          }
        });
      });

      // Convert to timeline array and calculate cumulative values
      const sortedDates = Array.from(dailyData.keys()).sort();
      let cumulativeCampaigns = 0;
      let cumulativeLeads = 0;
      let cumulativeAccounts = 0;
      let cumulativeContacts = 0;
      let cumulativeOpportunities = 0;
      let cumulativeRevenue = 0;

      sortedDates.forEach(date => {
        const dayData = dailyData.get(date)!;
        cumulativeCampaigns += dayData.campaignsCreated;
        cumulativeLeads += dayData.leadsGenerated;
        cumulativeAccounts += dayData.accountsCreated;
        cumulativeContacts += dayData.contactsCreated;
        cumulativeOpportunities += dayData.opportunitiesCreated;
        cumulativeRevenue += dayData.dailyRevenue;

        timelineAnalysis.push({
          date,
          campaignsCreated: dayData.campaignsCreated,
          cumulativeCampaigns,
          leadsGenerated: dayData.leadsGenerated,
          cumulativeLeads,
          accountsCreated: dayData.accountsCreated,
          cumulativeAccounts,
          contactsCreated: dayData.contactsCreated,
          cumulativeContacts,
          opportunitiesCreated: dayData.opportunitiesCreated,
          cumulativeOpportunities,
          dailyRevenue: dayData.dailyRevenue,
          cumulativeRevenue,
        });
      });

      // Transform top performing campaigns data
      const topCampaigns: TopPerformingCampaign[] = topCampaignsResponse.campaigns
        .map((campaign, index) => {
          const leadsCount = campaign.leadAggregate.aggregate.count;
          const accountsCount = campaign.accountAggregate.aggregate.count;
          const contactsCount = campaign.contactAggregate.aggregate.count;
          const opportunitiesCount = campaign.opportunityAggregate.aggregate.count;
          const wonOpportunitiesCount = campaign.wonOpportunityAggregate.aggregate.count;
          const totalRevenue = campaign.revenueAggregate.aggregate.sum.estimatedAmount || 0;

          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignType: campaign.type?.value || 'Unknown',
            status: getCampaignStatus(campaign.startDate, campaign.endDate),
            leadsCount,
            accountsCount,
            contactsCount,
            opportunitiesCount,
            wonOpportunitiesCount,
            totalRevenue,
            conversionRate: calculateConversionRate(accountsCount, leadsCount),
            winRate: calculateWinRate(wonOpportunitiesCount, opportunitiesCount),
            rank: index + 1,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
        .map((campaign, index) => ({ ...campaign, rank: index + 1 })); // Re-assign ranks

      // Transform top performing employees data
      // Create a map to aggregate employee performance across all campaigns
      const employeeMap = new Map<string, {
        id: string;
        displayName: string;
        firstName: string;
        lastName: string;
        campaignsCount: Set<string>;
        leadsCount: number;
        accountsCount: number;
        contactsCount: number;
        opportunitiesCount: number;
        wonOpportunitiesCount: number;
        totalRevenue: number;
        convertedLeads: number;
      }>();

      // Process each campaign and aggregate employee data (similar to individual campaign analytics)
      topEmployeesResponse.campaigns.forEach(campaign => {
        // Process leads for this campaign
        campaign.lead.forEach(lead => {
          const employee = lead.ownerEmployee;
          if (!employeeMap.has(employee.id)) {
            employeeMap.set(employee.id, {
              id: employee.id,
              displayName: employee.displayName,
              firstName: employee.firstName,
              lastName: employee.lastName,
              campaignsCount: new Set(),
              leadsCount: 0,
              accountsCount: 0,
              contactsCount: 0,
              opportunitiesCount: 0,
              wonOpportunitiesCount: 0,
              totalRevenue: 0,
              convertedLeads: 0,
            });
          }
          const emp = employeeMap.get(employee.id)!;
          emp.campaignsCount.add(campaign.id);
          emp.leadsCount++;
          if (lead.account) {
            emp.convertedLeads++;
          }
        });

        // Process accounts for this campaign
        campaign.account.forEach(account => {
          const employee = account.ownerEmployee;
          if (!employeeMap.has(employee.id)) {
            employeeMap.set(employee.id, {
              id: employee.id,
              displayName: employee.displayName,
              firstName: employee.firstName,
              lastName: employee.lastName,
              campaignsCount: new Set(),
              leadsCount: 0,
              accountsCount: 0,
              contactsCount: 0,
              opportunitiesCount: 0,
              wonOpportunitiesCount: 0,
              totalRevenue: 0,
              convertedLeads: 0,
            });
          }
          const emp = employeeMap.get(employee.id)!;
          emp.campaignsCount.add(campaign.id);
          emp.accountsCount++;
        });

        // Process contacts for this campaign
        campaign.contact.forEach(contact => {
          const employee = contact.ownerEmployee;
          if (!employeeMap.has(employee.id)) {
            employeeMap.set(employee.id, {
              id: employee.id,
              displayName: employee.displayName,
              firstName: employee.firstName,
              lastName: employee.lastName,
              campaignsCount: new Set(),
              leadsCount: 0,
              accountsCount: 0,
              contactsCount: 0,
              opportunitiesCount: 0,
              wonOpportunitiesCount: 0,
              totalRevenue: 0,
              convertedLeads: 0,
            });
          }
          const emp = employeeMap.get(employee.id)!;
          emp.campaignsCount.add(campaign.id);
          emp.contactsCount++;
        });

        // Process opportunities for this campaign
        campaign.opportunity.forEach(opportunity => {
          const employee = opportunity.ownerEmployee;
          if (!employeeMap.has(employee.id)) {
            employeeMap.set(employee.id, {
              id: employee.id,
              displayName: employee.displayName,
              firstName: employee.firstName,
              lastName: employee.lastName,
              campaignsCount: new Set(),
              leadsCount: 0,
              accountsCount: 0,
              contactsCount: 0,
              opportunitiesCount: 0,
              wonOpportunitiesCount: 0,
              totalRevenue: 0,
              convertedLeads: 0,
            });
          }
          const emp = employeeMap.get(employee.id)!;
          emp.campaignsCount.add(campaign.id);
          emp.opportunitiesCount++;
          if (opportunity.opportunityStatus?.value === 'Won') {
            emp.wonOpportunitiesCount++;
            emp.totalRevenue += opportunity.estimatedAmount || 0;
          }
        });
      });

      // Convert to final format and sort
      const topEmployees: TopPerformingEmployee[] = Array.from(employeeMap.values())
        .map((employee, index) => ({
          employeeId: employee.id,
          employeeName: employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          campaignsCount: employee.campaignsCount.size,
          leadsCount: employee.leadsCount,
          accountsCount: employee.accountsCount,
          contactsCount: employee.contactsCount,
          opportunitiesCount: employee.opportunitiesCount,
          wonOpportunitiesCount: employee.wonOpportunitiesCount,
          totalRevenue: employee.totalRevenue,
          averageConversionRate: calculateConversionRate(employee.convertedLeads, employee.leadsCount),
          averageWinRate: calculateWinRate(employee.wonOpportunitiesCount, employee.opportunitiesCount),
          rank: index + 1,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
        .map((employee, index) => ({ ...employee, rank: index + 1 })); // Re-assign ranks

      // Update state with transformed data
      setAnalyticsData({
        metrics,
        campaignComparisons,
        timelineAnalysis,
        topCampaigns,
        topEmployees,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      // console.error('Error loading campaigns analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    fetchTopPerformingEmployees
  ]);

  useEffect(() => {
    if (context.accessToken) {
      loadAnalyticsData();
    }
  }, [context.accessToken, loadAnalyticsData]);

  const refetch = useCallback(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  return {
    analyticsData,
    isLoading,
    error,
    refetch,
  };
};
