import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OverviewEntityConfig {
  leadEntity: string // "Lead" | "InvestmentLead"
  accountEntity: string // "Account" | "InvestmentAccount"
  opportunityEntity: string // "Opportunity" | "InvestmentOpportunity"
  contactEntity: string // "Contact" | "InvestmentContact"
}

export interface OverviewCounts {
  leads: number
  accounts: number
  opportunities: number
  contacts: number
}

export interface OverviewConversionMetrics {
  leadToOpportunityRate: number
  opportunityWinRate: number
  avgDealSize: number
  totalWonRevenue: number
  salesCycleLength?: number // Optional: calculated in specific implementations if needed
}

export interface OverviewTrendData {
  leads: { current: number; previous: number }
  accounts: { current: number; previous: number }
  opportunities: { current: number; previous: number }
  contacts: { current: number; previous: number }
  wonOpportunities: { current: number; previous: number }
  wonRevenue: { current: number; previous: number }
  convertedLeads: { current: number; previous: number }
}

export interface GenericOverviewData {
  overview: {
    totalCounts: OverviewCounts
    conversionMetrics: OverviewConversionMetrics
  }
  overviewTrendData: OverviewTrendData
}

export const useGenericOverviewData = (accessToken: string, config: OverviewEntityConfig, currencyCode?: string) => {
  const [mainData, setMainData] = useState<GenericOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

        // Calculate date ranges for last 30 days comparison
        const now = new Date()
        const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

        const query = `
          query GetOverviewOnlyAnalytics {
            # Current total entity counts
            ${config.leadEntity}Aggregate(where: { isDeleted: { _eq: false } }) {
              aggregate { count }
            }
            ${config.accountEntity}Aggregate(where: { isDeleted: { _eq: false } }) {
              aggregate { count }
            }
            ${config.opportunityEntity}Aggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
              aggregate { count }
            }
            ${config.contactEntity}Aggregate(where: { isDeleted: { _eq: false } }) {
              aggregate { count }
            }
            
            # Last 30 days entity counts for trend
            Last30DaysLeads: ${config.leadEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }
            Last30DaysAccounts: ${config.accountEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }
            Last30DaysOpportunities: ${config.opportunityEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate { count }
            }
            Last30DaysContacts: ${config.contactEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }
            
            # Previous 30 days entity counts for trend comparison
            Previous30DaysLeads: ${config.leadEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }
            Previous30DaysAccounts: ${config.accountEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }
            Previous30DaysOpportunities: ${config.opportunityEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate { count }
            }
            Previous30DaysContacts: ${config.contactEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }
            
            # Won opportunities - all time
            WonOpportunities: ${config.opportunityEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                opportunityStatus: { code: { _eq: "WON" } }${currencyFilter}
              }
            ) {
              aggregate { 
                count 
                sum { estimatedAmount }
              }
            }
            
            # Won opportunities - last 30 days
            Last30DaysWonOpportunities: ${config.opportunityEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                opportunityStatus: { code: { _eq: "WON" } },
                createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate { 
                count 
                sum { estimatedAmount }
              }
            }
            
            # Won opportunities - previous 30 days
            Previous30DaysWonOpportunities: ${config.opportunityEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                opportunityStatus: { code: { _eq: "WON" } },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate { 
                count 
                sum { estimatedAmount }
              }
            }
            
            # Converted leads - last 30 days
            Last30DaysConvertedLeads: ${config.leadEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${last30DaysStart}" },
                leadStatus: { value: { _in: ["Converted", "Qualified"] } }
              }
            ) {
              aggregate { count }
            }
            
            # Converted leads - previous 30 days
            Previous30DaysConvertedLeads: ${config.leadEntity}Aggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" },
                leadStatus: { value: { _in: ["Converted", "Qualified"] } }
              }
            ) {
              aggregate { count }
            }
          }
        `

        const result = await graphqlClient.request(query)

        // Transform data
        const totalLeads = result[`${config.leadEntity}Aggregate`]?.aggregate?.count || 0
        const totalAccounts = result[`${config.accountEntity}Aggregate`]?.aggregate?.count || 0
        const totalOpportunities = result[`${config.opportunityEntity}Aggregate`]?.aggregate?.count || 0
        const totalContacts = result[`${config.contactEntity}Aggregate`]?.aggregate?.count || 0

        const wonOpportunitiesCount = result.WonOpportunities?.aggregate?.count || 0
        const totalWonRevenue = result.WonOpportunities?.aggregate?.sum?.estimatedAmount || 0

        const leadToOpportunityRate = totalLeads > 0 ? Math.round((totalOpportunities / totalLeads) * 100) : 0
        const opportunityWinRate =
          totalOpportunities > 0 ? Math.round((wonOpportunitiesCount / totalOpportunities) * 100) : 0
        const avgDealSize = wonOpportunitiesCount > 0 ? totalWonRevenue / wonOpportunitiesCount : 0

        // Trend data
        const trendData: OverviewTrendData = {
          leads: {
            current: result.Last30DaysLeads?.aggregate?.count || 0,
            previous: result.Previous30DaysLeads?.aggregate?.count || 0
          },
          accounts: {
            current: result.Last30DaysAccounts?.aggregate?.count || 0,
            previous: result.Previous30DaysAccounts?.aggregate?.count || 0
          },
          opportunities: {
            current: result.Last30DaysOpportunities?.aggregate?.count || 0,
            previous: result.Previous30DaysOpportunities?.aggregate?.count || 0
          },
          contacts: {
            current: result.Last30DaysContacts?.aggregate?.count || 0,
            previous: result.Previous30DaysContacts?.aggregate?.count || 0
          },
          wonOpportunities: {
            current: result.Last30DaysWonOpportunities?.aggregate?.count || 0,
            previous: result.Previous30DaysWonOpportunities?.aggregate?.count || 0
          },
          wonRevenue: {
            current: result.Last30DaysWonOpportunities?.aggregate?.sum?.estimatedAmount || 0,
            previous: result.Previous30DaysWonOpportunities?.aggregate?.sum?.estimatedAmount || 0
          },
          convertedLeads: {
            current: result.Last30DaysConvertedLeads?.aggregate?.count || 0,
            previous: result.Previous30DaysConvertedLeads?.aggregate?.count || 0
          }
        }

        setMainData({
          overview: {
            totalCounts: {
              leads: totalLeads,
              accounts: totalAccounts,
              opportunities: totalOpportunities,
              contacts: totalContacts
            },
            conversionMetrics: {
              leadToOpportunityRate,
              opportunityWinRate,
              avgDealSize,
              totalWonRevenue
            }
          },
          overviewTrendData: trendData
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load overview data')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchOverviewData()
    }
  }, [
    accessToken,
    currencyCode,
    config.leadEntity,
    config.accountEntity,
    config.opportunityEntity,
    config.contactEntity
  ])

  return { data: mainData, isLoading, error }
}
