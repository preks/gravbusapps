import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

// Import types and GraphQL queries from separate files
export * from './CampaignAnalyticsTypes';
export * from './CampaignAnalyticsGraphQL';
import { 
  CampaignAnalyticsMetrics, 
  CampaignConversionFunnel, 
  CampaignTimelineAnalysis 
} from './CampaignAnalyticsTypes';
import {
  GET_CAMPAIGN_ANALYTICS_METRICS,
  GET_CAMPAIGN_CONVERSION_FUNNEL,
  GET_CAMPAIGN_TIMELINE_ANALYSIS,
  GET_CAMPAIGN_TOP_PERFORMERS
} from './CampaignAnalyticsGraphQL';

// Hook for Campaign Analytics Queries
export const useCampaignAnalyticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchAnalyticsMetrics = useCallback(async (campaignId: string): Promise<CampaignAnalyticsMetrics> => {
    const query = GET_CAMPAIGN_ANALYTICS_METRICS();
    try {
      const result = await graphqlClient.request<any>(query, { campaignId });
      
      const totalEntities = {
        leads: result.leadsCount.aggregate.count || 0,
        accounts: result.accountsCount.aggregate.count || 0,
        contacts: result.contactsCount.aggregate.count || 0,
        opportunities: result.opportunitiesCount.aggregate.count || 0
      };

      const conversionMetrics = {
        leadsConverted: result.convertedLeads.aggregate.count || 0,
        conversionRate: totalEntities.leads > 0 
          ? ((result.convertedLeads.aggregate.count || 0) / totalEntities.leads) * 100 
          : 0
      };

      const revenueMetrics = {
        totalPipeline: result.opportunitiesRevenue.aggregate.sum?.estimatedAmount || 0,
        wonRevenue: result.wonOpportunities.aggregate.sum?.estimatedAmount || 0,
        averageDealSize: result.opportunitiesRevenue.aggregate.avg?.estimatedAmount || 0,
        winRate: totalEntities.opportunities > 0 
          ? ((result.wonOpportunities.aggregate.count || 0) / totalEntities.opportunities) * 100 
          : 0
      };

      return {
        totalEntities,
        conversionMetrics,
        revenueMetrics,
        performanceMetrics: {
          activitiesCount: 0, // Will be calculated separately
          avgDaysToClose: 0, // Will be calculated separately
          topPerformers: [] // Will be fetched separately
        }
      };
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchConversionFunnel = useCallback(async (campaignId: string): Promise<CampaignConversionFunnel> => {
    const query = GET_CAMPAIGN_CONVERSION_FUNNEL();
    try {
      const result = await graphqlClient.request<any>(query, { campaignId });
      
      const convertedLeads = result.convertedLeads.aggregate.count || 0;
      const createdAccounts = result.createdAccounts.aggregate.count || 0;
      const createdContacts = result.createdContacts.aggregate.count || 0;
      const createdOpportunities = result.createdOpportunities.aggregate.count || 0;
      const wonOpportunities = result.wonOpportunities.aggregate.count || 0;

      // Create stages array with proper calculations
      const stages = [
        {
          stage: 'Converted Leads',
          count: convertedLeads,
          percentage: convertedLeads > 0 ? 100 : 0
        },
        {
          stage: 'Created Accounts',
          count: createdAccounts,
          percentage: convertedLeads > 0 ? (createdAccounts / convertedLeads) * 100 : 0,
          dropoffRate: convertedLeads > 0 ? ((convertedLeads - createdAccounts) / convertedLeads) * 100 : 0
        },
        {
          stage: 'Created Contacts',
          count: createdContacts,
          percentage: convertedLeads > 0 ? (createdContacts / convertedLeads) * 100 : 0,
          dropoffRate: createdAccounts > 0 ? ((createdAccounts - createdContacts) / createdAccounts) * 100 : 0
        },
        {
          stage: 'Created Opportunities',
          count: createdOpportunities,
          percentage: convertedLeads > 0 ? (createdOpportunities / convertedLeads) * 100 : 0,
          dropoffRate: createdContacts > 0 ? ((createdContacts - createdOpportunities) / createdContacts) * 100 : 0
        },
        {
          stage: 'Won Opportunities',
          count: wonOpportunities,
          percentage: convertedLeads > 0 ? (wonOpportunities / convertedLeads) * 100 : 0,
          dropoffRate: createdOpportunities > 0 ? ((createdOpportunities - wonOpportunities) / createdOpportunities) * 100 : 0
        }
      ];

      return { stages };
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchTimelineAnalysis = useCallback(async (campaignId: string): Promise<CampaignTimelineAnalysis> => {
    const query = GET_CAMPAIGN_TIMELINE_ANALYSIS();
    try {
      const result = await graphqlClient.request<any>(query, { campaignId });
      
      // Process timeline data to create daily/weekly/monthly aggregations
      // This is a simplified version - you might want to enhance this based on campaign duration
      const allDates = new Set<string>();
      
      // Collect all creation dates
      [...result.leads, ...result.accounts, ...result.contacts, ...result.opportunities]
        .forEach(entity => {
          if (entity.createdAt) {
            allDates.add(entity.createdAt.split('T')[0]); // Get just the date part
          }
        });

      const timeline = Array.from(allDates).sort().map(date => {
        const leadsOnDate = result.leads.filter((l: any) => l.createdAt?.startsWith(date)).length;
        const accountsOnDate = result.accounts.filter((a: any) => a.createdAt?.startsWith(date)).length;
        const contactsOnDate = result.contacts.filter((c: any) => c.createdAt?.startsWith(date)).length;
        const opportunitiesOnDate = result.opportunities.filter((o: any) => o.createdAt?.startsWith(date)).length;

        return {
          date,
          leads: leadsOnDate,
          accounts: accountsOnDate,
          contacts: contactsOnDate,
          opportunities: opportunitiesOnDate,
          cumulativeLeads: 0, // Will be calculated below
          cumulativeAccounts: 0,
          cumulativeContacts: 0,
          cumulativeOpportunities: 0
        };
      });

      // Calculate cumulative values
      let cumulativeLeads = 0;
      let cumulativeAccounts = 0;
      let cumulativeContacts = 0;
      let cumulativeOpportunities = 0;

      timeline.forEach(item => {
        cumulativeLeads += item.leads;
        cumulativeAccounts += item.accounts;
        cumulativeContacts += item.contacts;
        cumulativeOpportunities += item.opportunities;
        
        item.cumulativeLeads = cumulativeLeads;
        item.cumulativeAccounts = cumulativeAccounts;
        item.cumulativeContacts = cumulativeContacts;
        item.cumulativeOpportunities = cumulativeOpportunities;
      });

      return { entityCreationTimeline: timeline };
    } catch (error) {
      console.error('Error fetching timeline analysis:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchTopPerformers = useCallback(async (campaignId: string) => {
    const query = GET_CAMPAIGN_TOP_PERFORMERS();
    try {
      const result = await graphqlClient.request<any>(query, { campaignId });
      
      // Aggregate performance data by employee
      const performanceMap = new Map<string, {
        employeeId: string;
        employeeName: string;
        entitiesCount: number;
        revenue: number;
      }>();

      // Count entities per employee
      [...result.leadOwners, ...result.accountOwners, ...result.contactOwners].forEach((entity: any) => {
        if (entity.ownerEmployee) {
          const key = entity.ownerEmployee.id;
          const existing = performanceMap.get(key) || {
            employeeId: key,
            employeeName: entity.ownerEmployee.displayName,
            entitiesCount: 0,
            revenue: 0
          };
          existing.entitiesCount += 1;
          performanceMap.set(key, existing);
        }
      });

      // Add revenue from opportunities
      result.opportunityOwners.forEach((opp: any) => {
        if (opp.ownerEmployee && opp.estimatedAmount) {
          const key = opp.ownerEmployee.id;
          const existing = performanceMap.get(key) || {
            employeeId: key,
            employeeName: opp.ownerEmployee.displayName,
            entitiesCount: 0,
            revenue: 0
          };
          existing.entitiesCount += 1;
          
          // Only count won opportunities towards revenue
          if (opp.opportunityStatus?.value?.toLowerCase().includes('won')) {
            existing.revenue += opp.estimatedAmount;
          }
          
          performanceMap.set(key, existing);
        }
      });

      // Convert to array and sort by total score (entities + revenue weight)
      const topPerformers = Array.from(performanceMap.values())
        .sort((a, b) => {
          const scoreA = a.entitiesCount + (a.revenue / 10000); // Weight revenue
          const scoreB = b.entitiesCount + (b.revenue / 10000);
          return scoreB - scoreA;
        })
        .slice(0, 5); // Top 5 performers

      return topPerformers;
    } catch (error) {
      console.error('Error fetching top performers:', error);
      throw error;
    }
  }, [graphqlClient]);

  return {
    fetchAnalyticsMetrics,
    fetchConversionFunnel,
    fetchTimelineAnalysis,
    fetchTopPerformers
  };
};
