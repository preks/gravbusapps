import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface RevenueTrendData {
  month: string
  pipelineRevenue: number
  wonRevenue: number
  opportunities: number
}

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

/**
 * Shared hook for fetching revenue trends
 * Used by both CRM and IRM analytics modules
 *
 * @param accessToken - Authentication token
 * @param timeFilter - Time period filter
 * @param selectedPipelineId - Optional pipeline ID filter
 * @param currencyCode - Optional currency code filter
 * @param entityName - Entity name ('Opportunity' for CRM, 'InvestmentOpportunity' for IRM)
 * @param pipelineFieldName - Pipeline field name ('salesPipeline' for CRM, 'opportunityPipeline' for IRM)
 */
export const useRevenueTrends = (
  accessToken: string,
  timeFilter: TimeFilter = 'sixMonths',
  selectedPipelineId?: string,
  currencyCode?: string,
  entityName: 'Opportunity' | 'InvestmentOpportunity' = 'Opportunity',
  pipelineFieldName: 'salesPipeline' | 'opportunityPipeline' = 'salesPipeline'
) => {
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchRevenueTrends = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const periods = generateTimePeriods(timeFilter)

        const pipelineFilter = selectedPipelineId ? `${pipelineFieldName}: {id: {_eq: "${selectedPipelineId}"}}` : ''
        const currencyFilter = currencyCode ? `currency: {code: {_eq: "${currencyCode}"}}` : ''
        const baseWhere = `isDeleted: {_eq: false}${pipelineFilter ? ', ' + pipelineFilter : ''}${currencyFilter ? ', ' + currencyFilter : ''}`

        const queries = periods.map(
          (period, index) => `
          period${index}: ${entityName}Aggregate(
            where: {
              ${baseWhere}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }
          
          wonPeriod${index}: ${entityName}Aggregate(
            where: {
              ${baseWhere}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              opportunityStatus: {code: {_eq: "WON"}}
            }
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }
        `
        )

        const query = `
          query GetRevenueTrends {
            ${queries.join('\n')}
          }
        `

        const result = await graphqlClient.request(query)
        const trends = periods.map((period, index) => {
          const totalAmount = result[`period${index}`]?.aggregate?.sum?.estimatedAmount || 0
          const wonAmount = result[`wonPeriod${index}`]?.aggregate?.sum?.estimatedAmount || 0

          return {
            month: period.label,
            pipelineRevenue: totalAmount - wonAmount,
            wonRevenue: wonAmount,
            opportunities: result[`period${index}`]?.aggregate?.count || 0
          }
        })

        setRevenueTrends(trends)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchRevenueTrends()
    }
  }, [accessToken, graphqlClient, timeFilter, selectedPipelineId, currencyCode, entityName, pipelineFieldName])

  return { revenueTrends, isLoading, error }
}

// Helper function to generate time periods based on filter
function generateTimePeriods(timeFilter: TimeFilter) {
  const currentDate = new Date()
  const periods = []

  switch (timeFilter) {
    case 'month':
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - (i * 7 + 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `Week ${4 - i}`
        })
      }
      break

    case 'quarter':
      // Last 3 months
      for (let i = 2; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
        const monthName = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName
        })
      }
      break

    case 'sixMonths':
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
        const monthName = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName
        })
      }
      break

    case 'year':
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
        const monthName = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName
        })
      }
      break

    case 'historical': {
      // Last 5 years (yearly)
      const currentYear = currentDate.getFullYear()
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(currentYear - i, 0, 1)
        const yearEnd = new Date(currentYear - i + 1, 0, 1)

        periods.push({
          start: yearStart.toISOString(),
          end: yearEnd.toISOString(),
          label: yearStart.getFullYear().toString()
        })
      }
      break
    }

    default:
      // Default case: same as sixMonths - last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
        const monthName = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName
        })
      }
      break
  }

  return periods
}
