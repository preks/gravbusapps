import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Import the sales cycle calculation function
const calculateSalesCycleLength = (opportunities: any): number => {
  const wonOpportunities = (opportunities.WonOpportunitiesAndWithCloseDate || []).filter(
    (opp: any) => opp.opportunityStatus?.code === 'WON' && opp.closeDate
  )

  if (wonOpportunities.length === 0) return 0

  const totalDays = wonOpportunities.reduce((sum: number, opp: any) => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)

    // Validate that closeDate is not before createdAt (data quality check)
    if (closed < created) {
      console.warn(
        `Opportunity ${opp.id} has closeDate (${opp.closeDate}) before createdAt (${opp.createdAt}). Skipping this opportunity.`
      )
      return sum // Skip this opportunity
    }

    const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    // Additional safety check - ensure days is not negative
    if (days < 0) {
      console.warn(`Opportunity ${opp.id} calculated negative days (${days}). Skipping this opportunity.`)
      return sum // Skip this opportunity
    }

    return sum + days
  }, 0)

  // Count only valid opportunities (those that passed validation)
  const validOpportunities = wonOpportunities.filter((opp: any) => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)
    return closed >= created
  })

  if (validOpportunities.length === 0) return 0

  return Math.round(totalDays / validOpportunities.length)
}

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

  // Additional trend metrics for the new cards
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
            currentMonthLeads: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthAccounts: InvestmentAccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            currentMonthContacts: InvestmentContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Total entity counts (all existing)
            totalLeadsNow: InvestmentLeadAggregate(
              where: { isDeleted: {_eq: false} }
            ) { aggregate { count } }
            
            totalLeadsLastMonth: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            totalAccountsNow: InvestmentAccountAggregate(
              where: { isDeleted: {_eq: false} }
            ) { aggregate { count } }
            
            totalAccountsLastMonth: InvestmentAccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            totalOpportunitiesNow: InvestmentOpportunityAggregate(
              where: { isDeleted: {_eq: false}${currencyFilter} }
            ) { aggregate { count } }
            
            totalOpportunitiesLastMonth: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}${currencyFilter}
              }
            ) { aggregate { count } }
            
            totalContactsNow: InvestmentContactAggregate(
              where: { isDeleted: {_eq: false} }
            ) { aggregate { count } }
            
            totalContactsLastMonth: InvestmentContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthConvertedLeads: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
                leadStatus: {value: {_in: ["Converted", "Qualified"]}}
              }
            ) { aggregate { count } }
            
            currentMonthWonOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
                opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            # Previous month data
            previousMonthLeads: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthAccounts: InvestmentAccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            previousMonthContacts: InvestmentContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthConvertedLeads: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
                leadStatus: {value: {_in: ["Converted", "Qualified"]}}
              }
            ) { aggregate { count } }
            
            previousMonthWonOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
                opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
              }
            ) { aggregate { count sum { estimatedAmount } } }
            
            # Individual opportunity records for sales cycle calculation
            currentMonthWonOpportunitiesWithCloseDate: InvestmentOpportunity(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
                opportunityStatus: {code: {_eq: "WON"}}
                closeDate: {_isNull: false}${currencyFilter}
              }
            ) {
              id
              createdAt
              closeDate
              opportunityStatus { code }
            }
            
            previousMonthWonOpportunitiesWithCloseDate: InvestmentOpportunity(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
                opportunityStatus: {code: {_eq: "WON"}}
                closeDate: {_isNull: false}${currencyFilter}
              }
            ) {
              id
              createdAt
              closeDate
              opportunityStatus { code }
            }
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

          // Additional trend metrics for the new cards
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
          currentMonthSalesCycleLength: calculateSalesCycleLength({
            WonOpportunitiesAndWithCloseDate: result.currentMonthWonOpportunitiesWithCloseDate || []
          }),
          previousMonthSalesCycleLength: calculateSalesCycleLength({
            WonOpportunitiesAndWithCloseDate: result.previousMonthWonOpportunitiesWithCloseDate || []
          })
        })
      } catch (err) {
        console.error('Error fetching KPI trend data:', err)
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
