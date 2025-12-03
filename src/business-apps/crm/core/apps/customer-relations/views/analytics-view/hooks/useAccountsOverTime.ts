import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type AccountsTimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface AccountsOverTimePoint {
  date: string
  count: number
  accountsCreated: number
  accountsWithOpportunities: number
  accountsActive: number
}

export const useAccountsOverTime = (accessToken: string, timeFilter: AccountsTimeFilter = 'quarter') => {
  const [accountsOverTime, setAccountsOverTime] = useState<AccountsOverTimePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAccountsOverTime = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Generate time periods based on the selected filter
        const periods = generateTimePeriods(timeFilter)

        // Build aggregate queries for each period
        const periodAggregates = periods
          .map((period, index) => {
            return `
          # Accounts created in period ${index}
          accountsCreated_period${index}: AccountAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) { aggregate { count } }
          
          # Accounts with opportunities (cumulative up to period end)
          accountsWithOpportunities_period${index}: AccountAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_lt: "${period.end}"}
              opportunity: {id: {_isNull: false}}
            }
          ) { aggregate { count } }
          
          # Active accounts (accounts with opportunities in the last 90 days from period end)
          accountsActive_period${index}: AccountAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_lt: "${period.end}"}
              opportunity: {
                updatedAt: {_gte: "${new Date(new Date(period.end).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()}"}
              }
            }
          ) { aggregate { count } }
        `
          })
          .join('\n')

        const query = `
          query GetAccountsOverTime {
            ${periodAggregates}
          }
        `

        const result = await graphqlClient.request(query)

        // Transform result into AccountsOverTimePoint array
        const transformedData: AccountsOverTimePoint[] = periods.map((period, index) => {
          const accountsCreated = result[`accountsCreated_period${index}`]?.aggregate?.count || 0
          const accountsWithOpportunities = result[`accountsWithOpportunities_period${index}`]?.aggregate?.count || 0
          const accountsActive = result[`accountsActive_period${index}`]?.aggregate?.count || 0

          return {
            date: period.start,
            count: accountsCreated, // For backward compatibility
            accountsCreated,
            accountsWithOpportunities,
            accountsActive
          }
        })

        setAccountsOverTime(transformedData)
      } catch (err) {
        console.error('Error fetching accounts over time:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccountsOverTime()
  }, [accessToken, timeFilter, graphqlClient])

  return { accountsOverTime, isLoading, error }
}

// Helper function to generate time periods
const generateTimePeriods = (filter: AccountsTimeFilter): Array<{ start: string; end: string; label: string }> => {
  const now = new Date()
  const periods: Array<{ start: string; end: string; label: string }> = []

  switch (filter) {
    case 'month': {
      // Last 30 days, daily
      for (let i = 29; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - i)
        start.setHours(0, 0, 0, 0)

        const end = new Date(start)
        end.setDate(start.getDate() + 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      }
      break
    }

    case 'quarter': {
      // Last 3 months (monthly aggregation like Revenue Trends)
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

    case 'sixMonths': {
      // Last 6 months (monthly aggregation like Revenue Trends)
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

    case 'year': {
      // Last 12 months, monthly
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      }
      break
    }

    case 'historical': {
      // Last 5 years, yearly
      const currentYear = now.getFullYear()
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i
        const start = new Date(year, 0, 1) // January 1st
        const end = new Date(year + 1, 0, 1) // January 1st next year

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: year.toString()
        })
      }
      break
    }

    default: {
      // Default to quarter
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - i * 7)
        start.setHours(0, 0, 0, 0)

        const end = new Date(start)
        end.setDate(start.getDate() + 7)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      }
    }
  }

  return periods
}
