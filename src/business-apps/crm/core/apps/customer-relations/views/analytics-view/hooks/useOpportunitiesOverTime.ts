import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface OpportunityTimeSeriesData {
  date: string
  count: number
  value: number
  opportunitiesCreated: number
  opportunitiesWon: number
}

interface OpportunityData {
  createdAt: string
  estimatedAmount: number | null
  opportunityStatus: {
    code: string
  } | null
}

interface QueryVariables {
  startDate: string
  endDate?: string
}

export const useOpportunitiesOverTime = (accessToken: string, timeFilter: TimeFilter, selectedPipelineId?: string) => {
  const [data, setData] = useState<OpportunityTimeSeriesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchOpportunitiesOverTime = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Calculate date range based on selected time filter
      const endDate = new Date()
      const startDate = new Date()

      switch (timeFilter) {
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'sixMonths':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case 'historical':
          startDate.setFullYear(endDate.getFullYear() - 5)
          break
        default:
          startDate.setMonth(endDate.getMonth() - 3)
      }

      const query = selectedPipelineId
        ? `
        query GetOpportunitiesOverTime($startDate: timestamptz!, $pipelineId: String!) {
          # Get all opportunities created in the time range
          allOpportunities: Opportunity(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: $startDate}
              salesPipeline: {id: {_eq: $pipelineId}}
            }
            orderBy: {createdAt: ASC}
          ) {
            id
            createdAt
            estimatedAmount
            closeDate
            winningChance
            salesPipelineStage {
              value
            }
          }
          
          # Get won opportunities in the time range
          wonOpportunities: Opportunity(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: $startDate}
              opportunityStatus: {code: {_eq: "WON"}}
              salesPipeline: {id: {_eq: $pipelineId}}
            }
            orderBy: {createdAt: ASC}
          ) {
            id
            createdAt
            closeDate
            estimatedAmount
            opportunityStatus {
              code
            }
          }
        }
      `
        : `
        query GetOpportunitiesOverTime($startDate: timestamptz!) {
          # Get all opportunities created in the time range
          allOpportunities: Opportunity(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: $startDate}
            }
            orderBy: {createdAt: ASC}
          ) {
            id
            createdAt
            estimatedAmount
            closeDate
            winningChance
            salesPipelineStage {
              value
            }
          }
          
          # Get won opportunities in the time range
          wonOpportunities: Opportunity(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: $startDate}
              opportunityStatus: {code: {_eq: "WON"}}
            }
            orderBy: {createdAt: ASC}
          ) {
            id
            createdAt
            closeDate
            estimatedAmount
            opportunityStatus {
              code
            }
          }
        }
      `

      const variables: QueryVariables = {
        startDate: startDate.toISOString()
      }

      if (selectedPipelineId) {
        variables.pipelineId = selectedPipelineId
      }

      const result = await graphqlClient.request<{
        allOpportunities: OpportunityData[]
        wonOpportunities: OpportunityData[]
      }>(query, variables)

      // Create time series data
      const timeSeriesData = createTimeSeriesData(
        result.allOpportunities,
        result.wonOpportunities,
        startDate,
        endDate,
        timeFilter
      )

      setData(timeSeriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, timeFilter, selectedPipelineId])

  useEffect(() => {
    fetchOpportunitiesOverTime()
  }, [fetchOpportunitiesOverTime])

  return { data, isLoading, error, refetch: fetchOpportunitiesOverTime }
}

// Helper function to create time series data
function createTimeSeriesData(
  allOpportunities: OpportunityData[],
  wonOpportunities: OpportunityData[],
  startDate: Date,
  endDate: Date,
  timeFilter: TimeFilter
): OpportunityTimeSeriesData[] {
  // Create map for won opportunities lookup
  const wonOppsMap = new Map<string, any>()
  wonOpportunities.forEach(opp => {
    const dateKey = new Date(opp.createdAt).toISOString().split('T')[0]
    if (!wonOppsMap.has(dateKey)) {
      wonOppsMap.set(dateKey, [])
    }
    wonOppsMap.get(dateKey)!.push(opp)
  })

  // For month filter: return daily data, for historical: yearly data, for others: monthly periods
  if (timeFilter === 'month') {
    // Generate daily data points
    const dailyData = new Map<string, OpportunityTimeSeriesData>()

    // Initialize all days in the range
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0]
      dailyData.set(dateKey, {
        date: dateKey,
        count: 0,
        value: 0,
        opportunitiesCreated: 0,
        opportunitiesWon: 0
      })
      current.setDate(current.getDate() + 1)
    }

    // Aggregate opportunities by day
    allOpportunities.forEach(opp => {
      const dateKey = new Date(opp.createdAt).toISOString().split('T')[0]
      const dayData = dailyData.get(dateKey)
      if (dayData) {
        dayData.count += 1
        dayData.value += opp.estimatedAmount || 0
        dayData.opportunitiesCreated += 1
      }
    })

    // Add won opportunities
    wonOpportunities.forEach(opp => {
      const dateKey = new Date(opp.createdAt).toISOString().split('T')[0]
      const dayData = dailyData.get(dateKey)
      if (dayData) {
        dayData.opportunitiesWon += 1
      }
    })

    return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date))
  } else if (timeFilter === 'historical') {
    // Aggregate into yearly periods (last 5 years)
    const yearlyData = new Map<string, OpportunityTimeSeriesData>()

    // Initialize years in the range
    const currentYear = endDate.getFullYear()
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i
      const yearKey = `${year}-01-01`
      yearlyData.set(yearKey, {
        date: yearKey,
        count: 0,
        value: 0,
        opportunitiesCreated: 0,
        opportunitiesWon: 0
      })
    }

    // Aggregate opportunities by year
    allOpportunities.forEach(opp => {
      const date = new Date(opp.createdAt)
      const yearKey = `${date.getFullYear()}-01-01`
      const yearData = yearlyData.get(yearKey)
      if (yearData) {
        yearData.count += 1
        yearData.value += opp.estimatedAmount || 0
        yearData.opportunitiesCreated += 1
      }
    })

    // Add won opportunities
    wonOpportunities.forEach(opp => {
      const date = new Date(opp.createdAt)
      const yearKey = `${date.getFullYear()}-01-01`
      const yearData = yearlyData.get(yearKey)
      if (yearData) {
        yearData.opportunitiesWon += 1
      }
    })

    return Array.from(yearlyData.values()).sort((a, b) => a.date.localeCompare(b.date))
  } else {
    // Aggregate into monthly periods
    const monthlyData = new Map<string, OpportunityTimeSeriesData>()

    // Initialize months in the range
    const current = new Date(startDate)
    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`
      monthlyData.set(monthKey, {
        date: monthKey,
        count: 0,
        value: 0,
        opportunitiesCreated: 0,
        opportunitiesWon: 0
      })
      current.setMonth(current.getMonth() + 1)
    }

    // Aggregate opportunities by month
    allOpportunities.forEach(opp => {
      const date = new Date(opp.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      const monthData = monthlyData.get(monthKey)
      if (monthData) {
        monthData.count += 1
        monthData.value += opp.estimatedAmount || 0
        monthData.opportunitiesCreated += 1
      }
    })

    // Add won opportunities
    wonOpportunities.forEach(opp => {
      const date = new Date(opp.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      const monthData = monthlyData.get(monthKey)
      if (monthData) {
        monthData.opportunitiesWon += 1
      }
    })

    return Array.from(monthlyData.values()).sort((a, b) => a.date.localeCompare(b.date))
  }
}
