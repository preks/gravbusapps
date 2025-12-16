import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OpportunitiesEntityConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  leadEntity: string // 'Lead' or 'InvestmentLead'
  leadEntityAggregate: string // 'LeadAggregate' or 'InvestmentLeadAggregate'
  convertedLeadStatusCode: string // 'CONVERTED' for both CRM and IRM
  wonStatusCode: string // 'WON' for both
}

export interface GenericOpportunitiesStaticData {
  // Basic KPIs
  totalOpportunities: number
  totalValue: number
  wonOpportunities: number
  avgDealSize: number
  avgOpportunityValue: number // Average value of ALL opportunities in pipeline
  winRate: number
  pipelineVelocity: number
  conversionRate: number // Lead to Opportunity conversion rate (all time)

  // 30-day trend data
  last30DaysOpportunities: number
  previous30DaysOpportunities: number
  last30DaysTotalValue: number
  previous30DaysTotalValue: number
  last30DaysWonOpportunities: number
  previous30DaysWonOpportunities: number
  last30DaysAvgOpportunityValue: number // Average value (last 30 days)
  previous30DaysAvgOpportunityValue: number // Average value (previous 30 days)
  last30DaysConversionRate: number // Lead to Opportunity conversion (last 30 days)
  previous30DaysConversionRate: number // Lead to Opportunity conversion (previous 30 days)
}

/**
 * Generic hook for fetching static opportunities data (KPIs and trends) using aggregates.
 * Configurable for both CRM and IRM.
 */
export const useGenericOpportunitiesStaticData = (
  accessToken: string,
  config: OpportunitiesEntityConfig,
  currencyCode?: string
) => {
  const [data, setData] = useState<GenericOpportunitiesStaticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const last30DaysStart = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const previous30DaysStart = new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
        const previous30DaysEnd = last30DaysStart

        // Build currency filter
        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

        // Build lead status filter for conversion tracking
        const leadConvertedFilter = `leadStatus: { code: { _eq: "${config.convertedLeadStatusCode}" } }`

        const query = `
          query GetOpportunitiesStaticDataMega {
            # Total leads (all time) - for conversion rate
            totalLeads: ${config.leadEntityAggregate}(
              where: { isDeleted: { _eq: false } }
            ) {
              aggregate { count }
            }

            # Converted leads (all time) - for conversion rate
            convertedLeads: ${config.leadEntityAggregate}(
              where: {
                isDeleted: { _eq: false }
                ${leadConvertedFilter}
              }
            ) {
              aggregate { count }
            }

            # Total opportunities (all time)
            totalOpportunities: ${config.opportunityEntity}Aggregate(
              where: { isDeleted: { _eq: false }${currencyFilter} }
            ) {
              aggregate { count }
            }

            # Total value (all time)
            totalValue: ${config.opportunityEntity}Aggregate(
              where: { isDeleted: { _eq: false }${currencyFilter} }
            ) {
              aggregate {
                sum { estimatedAmount }
              }
            }

            # Won opportunities (all time) - for win rate
            wonOpportunities: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "${config.wonStatusCode}" } }${currencyFilter}
              }
            ) {
              aggregate { count }
            }

            # Won opportunities value (all time) - for avg deal size
            wonOpportunitiesValue: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "${config.wonStatusCode}" } }${currencyFilter}
              }
            ) {
              aggregate {
                sum { estimatedAmount }
              }
            }

            # Last 30 days - Total leads
            last30DaysLeads: ${config.leadEntityAggregate}(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${last30DaysStart}" }
              }
            ) {
              aggregate { count }
            }

            # Last 30 days - Converted leads
            last30DaysConvertedLeads: ${config.leadEntityAggregate}(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${last30DaysStart}" }
                ${leadConvertedFilter}
              }
            ) {
              aggregate { count }
            }

            # Last 30 days - New opportunities
            last30DaysOpportunities: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate { count }
            }

            # Last 30 days - Total value
            last30DaysTotalValue: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate {
                sum { estimatedAmount }
              }
            }

            # Last 30 days - Won opportunities
            last30DaysWonOpportunities: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "${config.wonStatusCode}" } }
                createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
              }
            ) {
              aggregate { count }
            }

            # Previous 30 days - Total leads
            previous30DaysLeads: ${config.leadEntityAggregate}(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}" }
              }
            ) {
              aggregate { count }
            }

            # Previous 30 days - Converted leads
            previous30DaysConvertedLeads: ${config.leadEntityAggregate}(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}" }
                ${leadConvertedFilter}
              }
            ) {
              aggregate { count }
            }

            # Previous 30 days - New opportunities
            previous30DaysOpportunities: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}" }${currencyFilter}
              }
            ) {
              aggregate { count }
            }

            # Previous 30 days - Total value
            previous30DaysTotalValue: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}" }${currencyFilter}
              }
            ) {
              aggregate {
                sum { estimatedAmount }
              }
            }

            # Previous 30 days - Won opportunities
            previous30DaysWonOpportunities: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "${config.wonStatusCode}" } }
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}" }${currencyFilter}
              }
            ) {
              aggregate { count }
            }

            # Pipeline velocity calculation - sample of last 100 opportunities for avg days
            pipelineVelocityOpps: ${config.opportunityEntity}(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
              }
              limit: 100
            ) {
              createdAt
              updatedAt
            }
          }
        `

        const result = await graphqlClient.request<any>(query)

        // Process results
        const totalLeads = result.totalLeads?.aggregate?.count || 0
        const convertedLeads = result.convertedLeads?.aggregate?.count || 0
        const totalOpportunities = result.totalOpportunities?.aggregate?.count || 0
        const totalValue = result.totalValue?.aggregate?.sum?.estimatedAmount || 0
        const wonOpportunities = result.wonOpportunities?.aggregate?.count || 0
        const wonOpportunitiesValue = result.wonOpportunitiesValue?.aggregate?.sum?.estimatedAmount || 0

        // Calculate avg deal size (won opportunities only)
        const avgDealSize = wonOpportunities > 0 ? wonOpportunitiesValue / wonOpportunities : 0

        // Calculate avg opportunity value (all opportunities)
        const avgOpportunityValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0

        // Calculate win rate
        const winRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0

        // Calculate conversion rate (Lead → Opportunity)
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

        // Calculate pipeline velocity (last 30 days)
        const pipelineVelocityOpps = result.pipelineVelocityOpps || []
        const pipelineVelocity = calculatePipelineVelocity(pipelineVelocityOpps)

        // 30-day trend data
        const last30DaysLeads = result.last30DaysLeads?.aggregate?.count || 0
        const last30DaysConvertedLeads = result.last30DaysConvertedLeads?.aggregate?.count || 0
        const previous30DaysLeads = result.previous30DaysLeads?.aggregate?.count || 0
        const previous30DaysConvertedLeads = result.previous30DaysConvertedLeads?.aggregate?.count || 0
        const last30DaysOpportunities = result.last30DaysOpportunities?.aggregate?.count || 0
        const previous30DaysOpportunities = result.previous30DaysOpportunities?.aggregate?.count || 0
        const last30DaysTotalValue = result.last30DaysTotalValue?.aggregate?.sum?.estimatedAmount || 0
        const previous30DaysTotalValue = result.previous30DaysTotalValue?.aggregate?.sum?.estimatedAmount || 0
        const last30DaysWonOpportunities = result.last30DaysWonOpportunities?.aggregate?.count || 0
        const previous30DaysWonOpportunities = result.previous30DaysWonOpportunities?.aggregate?.count || 0

        // Calculate 30-day avg opportunity values
        const last30DaysAvgOpportunityValue =
          last30DaysOpportunities > 0 ? last30DaysTotalValue / last30DaysOpportunities : 0
        const previous30DaysAvgOpportunityValue =
          previous30DaysOpportunities > 0 ? previous30DaysTotalValue / previous30DaysOpportunities : 0

        // Calculate 30-day conversion rates
        const last30DaysConversionRate = last30DaysLeads > 0 ? (last30DaysConvertedLeads / last30DaysLeads) * 100 : 0
        const previous30DaysConversionRate =
          previous30DaysLeads > 0 ? (previous30DaysConvertedLeads / previous30DaysLeads) * 100 : 0

        setData({
          totalOpportunities,
          totalValue,
          wonOpportunities,
          avgDealSize,
          avgOpportunityValue,
          winRate,
          pipelineVelocity,
          conversionRate,
          last30DaysOpportunities,
          previous30DaysOpportunities,
          last30DaysTotalValue,
          previous30DaysTotalValue,
          last30DaysWonOpportunities,
          previous30DaysWonOpportunities,
          last30DaysAvgOpportunityValue,
          previous30DaysAvgOpportunityValue,
          last30DaysConversionRate,
          previous30DaysConversionRate
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch opportunities static data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [
    accessToken,
    graphqlClient,
    currencyCode,
    config.opportunityEntity,
    config.leadEntity,
    config.leadEntityAggregate,
    config.convertedLeadStatusCode,
    config.wonStatusCode
  ])

  return { data, isLoading, error }
}

// Helper function to calculate pipeline velocity (avg days from created to last update)
const calculatePipelineVelocity = (opportunities: Array<{ createdAt: string; updatedAt: string }>): number => {
  if (opportunities.length === 0) return 0

  const totalDays = opportunities.reduce((sum, opp) => {
    const created = new Date(opp.createdAt)
    const updated = new Date(opp.updatedAt)
    const days = Math.max(0, Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
    return sum + days
  }, 0)

  return Math.round(totalDays / opportunities.length)
}
