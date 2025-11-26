import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Trend data interface for KPI comparisons
export interface KpiTrendData {
  // Current month counts (newly created)
  currentMonthLeads: number
  previousMonthLeads: number
  currentMonthAccounts: number
  previousMonthAccounts: number
  currentMonthOpportunities: number
  previousMonthOpportunities: number
  currentMonthContacts: number
  previousMonthContacts: number

  // Total counts (existing as of month end)
  totalLeadsThisMonth: number
  totalLeadsLastMonth: number
  totalAccountsThisMonth: number
  totalAccountsLastMonth: number
  totalOpportunitiesThisMonth: number
  totalOpportunitiesLastMonth: number
  totalContactsThisMonth: number
  totalContactsLastMonth: number

  // Current month conversion metrics
  currentMonthConvertedLeads: number
  previousMonthConvertedLeads: number
  currentMonthWonOpportunities: number
  previousMonthWonOpportunities: number
  currentMonthTotalOpportunityValue: number
  previousMonthTotalOpportunityValue: number
  currentMonthWonOpportunityCount: number
  previousMonthWonOpportunityCount: number

  // Actual KPI values for comparison
  actualConversionRateThisMonth: number
  actualConversionRateLastMonth: number
  actualOpportunityWinRateThisMonth: number
  actualOpportunityWinRateLastMonth: number
  actualAvgDealSizeThisMonth: number
  actualAvgDealSizeLastMonth: number

  // Aliases for OverviewTabLayout compatibility
  currentMonthLeadConversionRate: number
  previousMonthLeadConversionRate: number
  currentMonthAvgDealSize: number
  previousMonthAvgDealSize: number
  currentMonthSalesCycleLength: number
  previousMonthSalesCycleLength: number
}

// Custom hook for KPI trend data
export const useKpiTrendData = (accessToken: string, currencyCode?: string) => {
  const [trendData, setTrendData] = useState<KpiTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setIsLoading(true)

        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1

        // Calculate date ranges
        const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00Z`
        const nextMonthStart =
          currentMonth === 12
            ? `${currentYear + 1}-01-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01T00:00:00Z`

        const previousMonthStart =
          currentMonth === 1
            ? `${currentYear - 1}-12-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}-01T00:00:00Z`

        // Build currency filter condition if provided
        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

        const query = `
          query GetKpiTrendData {
            # Current month data
            currentMonthLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthAccounts: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthOpportunities: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            currentMonthContacts: ContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Total entity counts (all existing)
            totalLeadsNow: LeadAggregate(
              where: { isDeleted: {_eq: false} }
            ) { aggregate { count } }
            
            totalLeadsLastMonth: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            totalAccountsNow: AccountAggregate(
              where: { isDeleted: {_eq: false} }
            ) { aggregate { count } }
            
            totalAccountsLastMonth: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            totalOpportunitiesNow: OpportunityAggregate(
              where: { isDeleted: {_eq: false}${currencyFilter} }
            ) { aggregate { count } }
            
            totalOpportunitiesLastMonth: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}${currencyFilter}
              }
            ) { aggregate { count } }
            
            totalContactsNow: ContactAggregate(
              where: { isDeleted: {_eq: false} }
            ) { aggregate { count } }
            
            totalContactsLastMonth: ContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthConvertedLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
                leadStatus: {value: {_in: ["Converted", "Qualified"]}}
              }
            ) { aggregate { count } }
            
            currentMonthWonOpportunities: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
                opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            # Previous month data
            previousMonthLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthAccounts: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthOpportunities: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            previousMonthContacts: ContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthConvertedLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
                leadStatus: {value: {_in: ["Converted", "Qualified"]}}
              }
            ) { aggregate { count } }
            
            previousMonthWonOpportunities: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
                opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
          }
        `

        const result = await graphqlClient.request(query)

        setTrendData({
          currentMonthLeads: result.currentMonthLeads.aggregate.count,
          previousMonthLeads: result.previousMonthLeads.aggregate.count,
          currentMonthAccounts: result.currentMonthAccounts.aggregate.count,
          previousMonthAccounts: result.previousMonthAccounts.aggregate.count,
          currentMonthOpportunities: result.currentMonthOpportunities.aggregate.count,
          previousMonthOpportunities: result.previousMonthOpportunities.aggregate.count,
          currentMonthContacts: result.currentMonthContacts.aggregate.count,
          previousMonthContacts: result.previousMonthContacts.aggregate.count,
          totalLeadsThisMonth: result.totalLeadsNow.aggregate.count,
          totalLeadsLastMonth: result.totalLeadsLastMonth.aggregate.count,
          totalAccountsThisMonth: result.totalAccountsNow.aggregate.count,
          totalAccountsLastMonth: result.totalAccountsLastMonth.aggregate.count,
          totalOpportunitiesThisMonth: result.totalOpportunitiesNow.aggregate.count,
          totalOpportunitiesLastMonth: result.totalOpportunitiesLastMonth.aggregate.count,
          totalContactsThisMonth: result.totalContactsNow.aggregate.count,
          totalContactsLastMonth: result.totalContactsLastMonth.aggregate.count,
          currentMonthConvertedLeads: result.currentMonthConvertedLeads.aggregate.count,
          previousMonthConvertedLeads: result.previousMonthConvertedLeads.aggregate.count,
          currentMonthWonOpportunities: result.currentMonthWonOpportunities.aggregate.count,
          previousMonthWonOpportunities: result.previousMonthWonOpportunities.aggregate.count,
          currentMonthTotalOpportunityValue: result.currentMonthOpportunities.aggregate.sum?.estimatedAmount || 0,
          previousMonthTotalOpportunityValue: result.previousMonthOpportunities.aggregate.sum?.estimatedAmount || 0,
          currentMonthWonOpportunityCount: result.currentMonthWonOpportunities.aggregate.count,
          previousMonthWonOpportunityCount: result.previousMonthWonOpportunities.aggregate.count,
          actualConversionRateThisMonth:
            result.currentMonthLeads.aggregate.count > 0
              ? (result.currentMonthConvertedLeads.aggregate.count / result.currentMonthLeads.aggregate.count) * 100
              : 0,
          actualConversionRateLastMonth:
            result.previousMonthLeads.aggregate.count > 0
              ? (result.previousMonthConvertedLeads.aggregate.count / result.previousMonthLeads.aggregate.count) * 100
              : 0,
          actualOpportunityWinRateThisMonth:
            result.currentMonthOpportunities.aggregate.count > 0
              ? (result.currentMonthWonOpportunities.aggregate.count /
                  result.currentMonthOpportunities.aggregate.count) *
                100
              : 0,
          actualOpportunityWinRateLastMonth:
            result.previousMonthOpportunities.aggregate.count > 0
              ? (result.previousMonthWonOpportunities.aggregate.count /
                  result.previousMonthOpportunities.aggregate.count) *
                100
              : 0,
          actualAvgDealSizeThisMonth:
            result.currentMonthWonOpportunities.aggregate.count > 0
              ? (result.currentMonthWonOpportunities.aggregate.sum?.estimatedAmount || 0) /
                result.currentMonthWonOpportunities.aggregate.count
              : 0,
          actualAvgDealSizeLastMonth:
            result.previousMonthWonOpportunities.aggregate.count > 0
              ? (result.previousMonthWonOpportunities.aggregate.sum?.estimatedAmount || 0) /
                result.previousMonthWonOpportunities.aggregate.count
              : 0,
          // Aliases for OverviewTabLayout compatibility
          currentMonthLeadConversionRate:
            result.currentMonthLeads.aggregate.count > 0
              ? (result.currentMonthConvertedLeads.aggregate.count / result.currentMonthLeads.aggregate.count) * 100
              : 0,
          previousMonthLeadConversionRate:
            result.previousMonthLeads.aggregate.count > 0
              ? (result.previousMonthConvertedLeads.aggregate.count / result.previousMonthLeads.aggregate.count) * 100
              : 0,
          currentMonthAvgDealSize:
            result.currentMonthWonOpportunities.aggregate.count > 0
              ? (result.currentMonthWonOpportunities.aggregate.sum?.estimatedAmount || 0) /
                result.currentMonthWonOpportunities.aggregate.count
              : 0,
          previousMonthAvgDealSize:
            result.previousMonthWonOpportunities.aggregate.count > 0
              ? (result.previousMonthWonOpportunities.aggregate.sum?.estimatedAmount || 0) /
                result.previousMonthWonOpportunities.aggregate.count
              : 0,
          currentMonthSalesCycleLength: 0, // TODO: Calculate sales cycle length
          previousMonthSalesCycleLength: 0 // TODO: Calculate sales cycle length
        })
      } catch {
        // console.error('Error fetching KPI trend data:', err);
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchTrendData()
    }
  }, [accessToken, graphqlClient, currencyCode])

  return { trendData, isLoading }
}
