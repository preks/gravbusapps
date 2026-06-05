import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

// Import types and GraphQL queries from separate files
export * from './CampaignAnalyticsTypes'
export * from './CampaignAnalyticsGraphQL'
import { CampaignAnalyticsMetrics, CampaignConversionFunnel, CampaignTimelineAnalysis } from './CampaignAnalyticsTypes'
import {
  GET_CAMPAIGN_ANALYTICS_METRICS,
  GET_CAMPAIGN_CONVERSION_FUNNEL,
  GET_CAMPAIGN_TIMELINE_ANALYSIS,
  GET_CAMPAIGN_TOP_PERFORMERS
} from './CampaignAnalyticsGraphQL'

// Internal types for GraphQL results
interface EntityWithCreatedAt {
  createdAt?: string
}

interface EntityWithOwner extends EntityWithCreatedAt {
  ownerEmployee?: {
    id: string
    displayName: string
  }
}

interface LeadEntity extends EntityWithOwner {
  account?: {
    id: string
  }
}

interface OpportunityEntity extends EntityWithOwner {
  estimatedAmount?: string
  opportunityStatus?: {
    id: string
    value: string
  }
  stage?: {
    id: string
    value: string
  }
}

// Hook for Campaign Analytics Queries
export const useCampaignAnalyticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAnalyticsMetrics = useCallback(
    async (campaignId: string): Promise<CampaignAnalyticsMetrics> => {
      const query = GET_CAMPAIGN_ANALYTICS_METRICS()
      const result = await graphqlClient.request<any>(query, { campaignId })

      const totalEntities = {
        leads: result.leadsCount.aggregate.count || 0,
        accounts: result.accountsCount.aggregate.count || 0,
        contacts: result.contactsCount.aggregate.count || 0,
        opportunities: result.opportunitiesCount.aggregate.count || 0
      }

      const conversionMetrics = {
        leadsConverted: result.convertedLeads.aggregate.count || 0,
        conversionRate:
          totalEntities.leads > 0 ? ((result.convertedLeads.aggregate.count || 0) / totalEntities.leads) * 100 : 0
      }

      const revenueMetrics = {
        totalPipeline: result.opportunitiesRevenue.aggregate.sum?.estimatedAmount || 0,
        wonRevenue: result.wonOpportunities.aggregate.sum?.estimatedAmount || 0,
        averageOpportunitySize: result.opportunitiesRevenue.aggregate.avg?.estimatedAmount || 0,
        winRate:
          totalEntities.opportunities > 0
            ? ((result.wonOpportunities.aggregate.count || 0) / totalEntities.opportunities) * 100
            : 0
      }

      return {
        totalEntities,
        conversionMetrics,
        revenueMetrics,
        performanceMetrics: {
          activitiesCount: 0, // Will be calculated separately
          avgDaysToClose: 0, // Will be calculated separately
          topPerformers: [] // Will be fetched separately
        }
      }
    },
    [graphqlClient]
  )

  const fetchConversionFunnel = useCallback(
    async (campaignId: string): Promise<CampaignConversionFunnel> => {
      const query = GET_CAMPAIGN_CONVERSION_FUNNEL()
      const result = await graphqlClient.request<any>(query, { campaignId })

      const totalLeads = result.totalLeads.aggregate.count || 0
      const convertedLeads = result.convertedLeads.aggregate.count || 0
      const createdAccounts = result.createdAccounts.aggregate.count || 0
      const createdContacts = result.createdContacts.aggregate.count || 0
      const createdOpportunities = result.createdOpportunities.aggregate.count || 0
      const wonOpportunities = result.wonOpportunities.aggregate.count || 0

      // Create stages array with proper calculations
      const stages = [
        {
          stage: 'Total Leads',
          count: totalLeads,
          percentage: totalLeads > 0 ? 100 : 0
        },
        {
          stage: 'Converted Leads',
          count: convertedLeads,
          percentage: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
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
          dropoffRate:
            createdOpportunities > 0 ? ((createdOpportunities - wonOpportunities) / createdOpportunities) * 100 : 0
        }
      ]

      return { stages }
    },
    [graphqlClient]
  )

  const fetchTimelineAnalysis = useCallback(
    async (campaignId: string): Promise<CampaignTimelineAnalysis> => {
      const query = GET_CAMPAIGN_TIMELINE_ANALYSIS()
      const result = await graphqlClient.request<any>(query, { campaignId })

      // Process timeline data to create daily/weekly/monthly aggregations
      // This is a simplified version - you might want to enhance this based on campaign duration
      const allDates = new Set<string>()

      // Collect all creation dates
      ;[...result.leads, ...result.accounts, ...result.contacts, ...result.opportunities].forEach(entity => {
        if (entity.createdAt) {
          allDates.add(entity.createdAt.split('T')[0]) // Get just the date part
        }
      })

      const leads = result.leads as EntityWithCreatedAt[]
      const accounts = result.accounts as EntityWithCreatedAt[]
      const contacts = result.contacts as EntityWithCreatedAt[]
      const opportunities = result.opportunities as OpportunityEntity[]

      const timeline = Array.from(allDates)
        .sort((a, b) => a.localeCompare(b))
        .map(date => {
          const leadsOnDate = leads.filter(l => l.createdAt?.startsWith(date)).length
          const accountsOnDate = accounts.filter(a => a.createdAt?.startsWith(date)).length
          const contactsOnDate = contacts.filter(c => c.createdAt?.startsWith(date)).length
          const opportunitiesOnDate = opportunities.filter(o => o.createdAt?.startsWith(date)).length

          // Calculate daily revenue from opportunities created on this date
          const dailyRevenue = opportunities
            .filter(o => o.createdAt?.startsWith(date))
            .reduce((sum, o) => sum + (Number.parseFloat(o.estimatedAmount || '0') || 0), 0)

          return {
            date,
            leads: leadsOnDate,
            accounts: accountsOnDate,
            contacts: contactsOnDate,
            opportunities: opportunitiesOnDate,
            dailyRevenue,
            cumulativeLeads: 0, // Will be calculated below
            cumulativeAccounts: 0,
            cumulativeContacts: 0,
            cumulativeOpportunities: 0,
            cumulativeRevenue: 0
          }
        })

      // Calculate cumulative values
      let cumulativeLeads = 0
      let cumulativeAccounts = 0
      let cumulativeContacts = 0
      let cumulativeOpportunities = 0
      let cumulativeRevenue = 0

      timeline.forEach(item => {
        cumulativeLeads += item.leads
        cumulativeAccounts += item.accounts
        cumulativeContacts += item.contacts
        cumulativeOpportunities += item.opportunities
        cumulativeRevenue += item.dailyRevenue

        item.cumulativeLeads = cumulativeLeads
        item.cumulativeAccounts = cumulativeAccounts
        item.cumulativeContacts = cumulativeContacts
        item.cumulativeOpportunities = cumulativeOpportunities
        item.cumulativeRevenue = cumulativeRevenue
      })

      return { entityCreationTimeline: timeline }
    },
    [graphqlClient]
  )

  const fetchTopPerformers = useCallback(
    async (campaignId: string) => {
      const query = GET_CAMPAIGN_TOP_PERFORMERS()
      const result = await graphqlClient.request<{
        leads: LeadEntity[]
        accounts: EntityWithOwner[]
        contacts: EntityWithOwner[]
        opportunities: OpportunityEntity[]
      }>(query, { campaignId })

      // Aggregate performance data by employee with detailed breakdowns
      const performanceMap = new Map<
        string,
        {
          employeeId: string
          employeeName: string
          leads: { total: number; converted: number }
          opportunities: { total: number; won: number }
          contacts: { total: number }
          accounts: { total: number }
          revenue: number
        }
      >()

      // Process leads
      result.leads.forEach(lead => {
        if (lead.ownerEmployee) {
          const key = lead.ownerEmployee.id
          const existing = performanceMap.get(key) || {
            employeeId: key,
            employeeName: lead.ownerEmployee.displayName,
            leads: { total: 0, converted: 0 },
            opportunities: { total: 0, won: 0 },
            contacts: { total: 0 },
            accounts: { total: 0 },
            revenue: 0
          }
          existing.leads.total += 1

          // Lead is converted if it has an associated account
          if (lead.account?.id) {
            existing.leads.converted += 1
          }

          performanceMap.set(key, existing)
        }
      })

      // Process accounts
      result.accounts.forEach(account => {
        if (account.ownerEmployee) {
          const key = account.ownerEmployee.id
          const existing = performanceMap.get(key) || {
            employeeId: key,
            employeeName: account.ownerEmployee.displayName,
            leads: { total: 0, converted: 0 },
            opportunities: { total: 0, won: 0 },
            contacts: { total: 0 },
            accounts: { total: 0 },
            revenue: 0
          }
          existing.accounts.total += 1
          performanceMap.set(key, existing)
        }
      })

      // Process contacts
      result.contacts.forEach(contact => {
        if (contact.ownerEmployee) {
          const key = contact.ownerEmployee.id
          const existing = performanceMap.get(key) || {
            employeeId: key,
            employeeName: contact.ownerEmployee.displayName,
            leads: { total: 0, converted: 0 },
            opportunities: { total: 0, won: 0 },
            contacts: { total: 0 },
            accounts: { total: 0 },
            revenue: 0
          }
          existing.contacts.total += 1
          performanceMap.set(key, existing)
        }
      })

      // Process opportunities
      result.opportunities.forEach(opp => {
        if (opp.ownerEmployee) {
          const key = opp.ownerEmployee.id
          const existing = performanceMap.get(key) || {
            employeeId: key,
            employeeName: opp.ownerEmployee.displayName,
            leads: { total: 0, converted: 0 },
            opportunities: { total: 0, won: 0 },
            contacts: { total: 0 },
            accounts: { total: 0 },
            revenue: 0
          }
          existing.opportunities.total += 1

          // Check if opportunity is won
          const isWon = opp.opportunityStatus?.value?.toLowerCase().includes('won')
          if (isWon) {
            existing.opportunities.won += 1
            existing.revenue += Number.parseFloat(opp.estimatedAmount || '0') || 0
          }

          performanceMap.set(key, existing)
        }
      })

      // Convert to array and sort by won revenue (primary criterion)
      const topPerformers = Array.from(performanceMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5) // Top 5 performers

      return topPerformers
    },
    [graphqlClient]
  )

  return {
    fetchAnalyticsMetrics,
    fetchConversionFunnel,
    fetchTimelineAnalysis,
    fetchTopPerformers
  }
}
