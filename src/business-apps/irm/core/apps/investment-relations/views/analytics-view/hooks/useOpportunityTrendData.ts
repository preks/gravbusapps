import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

interface OpportunityTrendData {
  // Current month counts (newly created)
  currentMonthOpportunities: number
  previousMonthOpportunities: number
  currentMonthClosedOpportunities: number
  previousMonthClosedOpportunities: number

  // Total opportunities counts (existing as of month end)
  totalOpportunitiesThisMonth: number
  totalOpportunitiesLastMonth: number

  // Actual KPI values for this month
  actualWinRateThisMonth: number
  actualWinRateLastMonth: number
  actualAvgOpportunitySizeThisMonth: number
  actualAvgOpportunitySizeLastMonth: number
  actualAvgOpportunityValueThisMonth: number // Average value of ALL opportunities
  actualAvgOpportunityValueLastMonth: number // Average value of ALL opportunities (previous period)
  actualAvgSalesCycleLastMonth: number
  actualConversionRateThisMonth: number
  actualConversionRateLastMonth: number

  // Period-based data (based on selected filter)
  currentPeriodOpportunities: number
  previousPeriodOpportunities: number

  // Pipeline value data
  currentPeriodPipelineValue: number
  previousPeriodPipelineValue: number
}

export const useOpportunityTrendData = (
  accessToken: string,
  selectedTimeFilter: TimeFilter,
  selectedPipelineId?: string,
  currencyCode?: string
) => {
  const [trendData, setTrendData] = useState<OpportunityTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchOpportunityTrendData = async () => {
      try {
        setIsLoading(true)

        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1

        // Date ranges calculation starting

        // Current month ranges
        const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00Z`
        const nextMonthStart =
          currentMonth === 12
            ? `${currentYear + 1}-01-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01T00:00:00Z`

        // Previous month ranges
        const previousMonthStart =
          currentMonth === 1
            ? `${currentYear - 1}-12-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}-01T00:00:00Z`

        // Period-based ranges (based on time filter)
        let currentPeriodStart: string, currentPeriodEnd: string, previousPeriodStart: string, previousPeriodEnd: string

        switch (selectedTimeFilter) {
          case 'month':
            currentPeriodStart = currentMonthStart
            currentPeriodEnd = nextMonthStart
            previousPeriodStart = previousMonthStart
            previousPeriodEnd = currentMonthStart
            break
          case 'quarter':
            const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1
            const quarterEndMonth = quarterStartMonth + 3
            currentPeriodStart = `${currentYear}-${String(quarterStartMonth).padStart(2, '0')}-01T00:00:00Z`
            currentPeriodEnd =
              quarterEndMonth > 12
                ? `${currentYear + 1}-01-01T00:00:00Z`
                : `${currentYear}-${String(quarterEndMonth).padStart(2, '0')}-01T00:00:00Z`
            previousPeriodStart =
              quarterStartMonth > 3
                ? `${currentYear}-${String(quarterStartMonth - 3).padStart(2, '0')}-01T00:00:00Z`
                : `${currentYear - 1}-${String(quarterStartMonth + 9).padStart(2, '0')}-01T00:00:00Z`
            previousPeriodEnd = currentPeriodStart
            break
          case 'sixMonths':
            const sixMonthsAgo = new Date(currentDate)
            sixMonthsAgo.setMonth(currentDate.getMonth() - 6)
            currentPeriodStart = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(
              2,
              '0'
            )}-01T00:00:00Z`
            currentPeriodEnd = nextMonthStart
            const twelveMonthsAgo = new Date(currentDate)
            twelveMonthsAgo.setMonth(currentDate.getMonth() - 12)
            previousPeriodStart = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(
              2,
              '0'
            )}-01T00:00:00Z`
            previousPeriodEnd = currentPeriodStart
            break
          case 'year':
            currentPeriodStart = `${currentYear}-01-01T00:00:00Z`
            currentPeriodEnd = `${currentYear + 1}-01-01T00:00:00Z`
            previousPeriodStart = `${currentYear - 1}-01-01T00:00:00Z`
            previousPeriodEnd = currentPeriodStart
            break
          default:
            currentPeriodStart = currentMonthStart
            currentPeriodEnd = nextMonthStart
            previousPeriodStart = previousMonthStart
            previousPeriodEnd = currentMonthStart
        }

        // Debug: Log period ranges

        // Currency filter clause
        const currencyFilter = currencyCode ? `currency: {code: {_eq: "${currencyCode}"}}` : ''

        // Simple, clean query for debugging
        const query = `
          query GetOpportunityTrendData {
            currentPeriodOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentPeriodStart}", _lt: "${currentPeriodEnd}"}
                ${currencyFilter}
              }
            ) { 
              aggregate { 
                count 
                sum { estimatedAmount }
              } 
            }
            
            currentPeriodLeads: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentPeriodStart}", _lt: "${currentPeriodEnd}"}
              }
            ) {
              aggregate { count }
            }
            
            previousPeriodOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousPeriodStart}", _lt: "${previousPeriodEnd}"}
                ${currencyFilter}
              }
            ) { 
              aggregate { 
                count 
                sum { estimatedAmount }
              } 
            }
            
            previousPeriodLeads: InvestmentLeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousPeriodStart}", _lt: "${previousPeriodEnd}"}
              }
            ) {
              aggregate { count }
            }
            
            currentPeriodWonOpportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentPeriodStart}", _lt: "${currentPeriodEnd}"}
                opportunityStatus: {code: {_eq: "WON"}}
                ${currencyFilter}
              }
            ) { 
              aggregate { 
                count 
                sum { estimatedAmount }
              } 
            }
          }
        `

        // Debug: Log the query

        const result = await graphqlClient.request(query)

        // Calculate win rates (period-based only for now)
        const currentPeriodWinRate =
          result.currentPeriodOpportunities.aggregate.count > 0
            ? (result.currentPeriodWonOpportunities.aggregate.count /
                result.currentPeriodOpportunities.aggregate.count) *
              100
            : 0

        // Calculate average opportunity sizes (period-based)
        const currentPeriodAvgOpportunitySize =
          result.currentPeriodOpportunities.aggregate.count > 0
            ? (result.currentPeriodOpportunities.aggregate.sum?.estimatedAmount || 0) /
              result.currentPeriodOpportunities.aggregate.count
            : 0
        const previousPeriodAvgOpportunitySize =
          result.previousPeriodOpportunities.aggregate.count > 0
            ? (result.previousPeriodOpportunities.aggregate.sum?.estimatedAmount || 0) /
              result.previousPeriodOpportunities.aggregate.count
            : 0

        // Calculate period-based conversion rate (simplified)
        const currentPeriodConversionRate =
          result.currentPeriodLeads.aggregate.count > 0
            ? (result.currentPeriodOpportunities.aggregate.count / result.currentPeriodLeads.aggregate.count) * 100
            : 0
        const previousPeriodConversionRate =
          result.previousPeriodLeads.aggregate.count > 0
            ? (result.previousPeriodOpportunities.aggregate.count / result.previousPeriodLeads.aggregate.count) * 100
            : 0

        setTrendData({
          // Use dummy values for missing data (will be cleaned up later)
          currentMonthOpportunities: 0,
          previousMonthOpportunities: 0,
          currentMonthClosedOpportunities: 0,
          previousMonthClosedOpportunities: 0,
          totalOpportunitiesThisMonth: 0,
          totalOpportunitiesLastMonth: 0,

          // Real calculated values
          actualWinRateThisMonth: Math.round(currentPeriodWinRate),
          actualWinRateLastMonth: 0, // Will add later
          actualAvgOpportunitySizeThisMonth: Math.round(currentPeriodAvgOpportunitySize),
          actualAvgOpportunitySizeLastMonth: Math.round(previousPeriodAvgOpportunitySize),
          actualAvgOpportunityValueThisMonth: Math.round(currentPeriodAvgOpportunitySize), // Same as avgOpportunitySize (all opps)
          actualAvgOpportunityValueLastMonth: Math.round(previousPeriodAvgOpportunitySize), // Same as avgOpportunitySize (previous period)
          actualAvgSalesCycleLastMonth: 0,
          actualConversionRateThisMonth: Math.round(currentPeriodConversionRate),
          actualConversionRateLastMonth: Math.round(previousPeriodConversionRate),

          // Period-based data (the important ones)
          currentPeriodOpportunities: result.currentPeriodOpportunities.aggregate.count,
          previousPeriodOpportunities: result.previousPeriodOpportunities.aggregate.count,
          currentPeriodPipelineValue: result.currentPeriodOpportunities.aggregate.sum?.estimatedAmount || 0,
          previousPeriodPipelineValue: result.previousPeriodOpportunities.aggregate.sum?.estimatedAmount || 0
        })
      } catch {
        // console.error("Error fetching opportunity trend data:", err);
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchOpportunityTrendData()
    }
  }, [accessToken, graphqlClient, selectedTimeFilter, selectedPipelineId, currencyCode])

  return { trendData, isLoading }
}
