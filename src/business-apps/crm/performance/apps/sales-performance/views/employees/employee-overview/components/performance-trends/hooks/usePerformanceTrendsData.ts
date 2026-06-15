import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TimeFilter } from '../PerformanceTrendsChart'
import dayjs from 'dayjs'

export interface PerformanceTrendsDataPoint {
  period: string // Formatted date string for display
  date: string // ISO date for sorting
  convertedLeads: number // Count in this specific period
  contactsWithAccounts: number // Count in this specific period
  wonOpportunities: number // Count in this specific period
  managedAccounts: number // Count in this specific period
}

export interface UsePerformanceTrendsDataResult {
  trendsData: PerformanceTrendsDataPoint[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Helper to build period-specific aggregate query
// Fetches counts for entities created/won within the specific period only
const buildPeriodAggregateQuery = (
  periodLabel: string,
  startDate: string,
  endDate: string,
  employeeId: string
): string => {
  return `
    ${periodLabel}ConvertedLeads: LeadAggregate(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: "${employeeId}" }
        leadStatus: { code: { _eq: "CONVERTED" } }
        createdAt: { _gte: "${startDate}", _lt: "${endDate}" }
      }
    ) {
      aggregate {
        count
      }
    }
    
    ${periodLabel}ContactsWithAccounts: ContactAggregate(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: "${employeeId}" }
        accountId: { _isNull: false }
        createdAt: { _gte: "${startDate}", _lt: "${endDate}" }
      }
    ) {
      aggregate {
        count
      }
    }
    
    ${periodLabel}WonOpportunities: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: "${employeeId}" }
        opportunityStatus: { code: { _eq: "WON" } }
        _or: [
          { closeDate: { _gte: "${startDate}", _lt: "${endDate}" } }
          { _and: [{ closeDate: { _isNull: true } }, { createdAt: { _gte: "${startDate}", _lt: "${endDate}" } }] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    ${periodLabel}ManagedAccounts: AccountAggregate(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: "${employeeId}" }
        createdAt: { _gte: "${startDate}", _lt: "${endDate}" }
      }
    ) {
      aggregate {
        count
      }
    }
  `
}

interface AggregateResult {
  aggregate: {
    count: number
  }
}

export const usePerformanceTrendsData = (
  context: BusinessAppContextProps,
  timeFilter: TimeFilter,
  employeeId: string
): UsePerformanceTrendsDataResult => {
  const [trendsData, setTrendsData] = useState<PerformanceTrendsDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Generate time periods based on filter
  const generatePeriods = useCallback((filter: TimeFilter) => {
    const periods: Array<{ label: string; startDate: Date; endDate: Date; displayLabel: string }> = []
    const endDate = dayjs()
    let startDate: dayjs.Dayjs

    switch (filter) {
      case 'month':
        // Daily periods for last month
        startDate = endDate.subtract(1, 'month')
        for (let i = 0; i <= 30; i++) {
          const day = startDate.add(i, 'day')
          periods.push({
            label: `day${i}`,
            startDate: day.startOf('day').toDate(),
            endDate: day.endOf('day').toDate(),
            displayLabel: day.format('MMM D')
          })
        }
        break

      case 'quarter':
        // Monthly periods for last quarter
        startDate = endDate.subtract(3, 'month')
        for (let i = 0; i < 3; i++) {
          const month = startDate.add(i, 'month')
          periods.push({
            label: `month${i}`,
            startDate: month.startOf('month').toDate(),
            endDate: month.endOf('month').toDate(),
            displayLabel: month.format('MMM YYYY')
          })
        }
        break

      case 'sixMonths':
        // Monthly periods for last 6 months
        startDate = endDate.subtract(6, 'month')
        for (let i = 0; i < 6; i++) {
          const month = startDate.add(i, 'month')
          periods.push({
            label: `month${i}`,
            startDate: month.startOf('month').toDate(),
            endDate: month.endOf('month').toDate(),
            displayLabel: month.format('MMM YYYY')
          })
        }
        break

      case 'year':
        // Monthly periods for last year
        startDate = endDate.subtract(12, 'month')
        for (let i = 0; i < 12; i++) {
          const month = startDate.add(i, 'month')
          periods.push({
            label: `month${i}`,
            startDate: month.startOf('month').toDate(),
            endDate: month.endOf('month').toDate(),
            displayLabel: month.format('MMM YYYY')
          })
        }
        break

      case 'historical':
        // Yearly periods for 5 years
        startDate = endDate.subtract(5, 'year')
        for (let i = 0; i < 5; i++) {
          const year = startDate.add(i, 'year')
          periods.push({
            label: `year${i}`,
            startDate: year.startOf('year').toDate(),
            endDate: year.endOf('year').toDate(),
            displayLabel: year.format('YYYY')
          })
        }
        break
    }

    return periods
  }, [])

  // Fetch trends data using aggregate queries
  const fetchTrendsData = useCallback(async () => {
    if (!employeeId || !context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const periods = generatePeriods(timeFilter)

      // Build the complete query with period-specific aggregates
      const queryParts = periods.map(period =>
        buildPeriodAggregateQuery(
          period.label,
          period.startDate.toISOString(),
          period.endDate.toISOString(),
          employeeId
        )
      )

      const query = `
        query GetPerformanceTrends {
          ${queryParts.join('\n')}
        }
      `

      const result = await graphqlClient.request<Record<string, AggregateResult>>(query)

      // Process results into data points (period-specific counts)
      const dataPoints: PerformanceTrendsDataPoint[] = periods.map(period => ({
        period: period.displayLabel,
        date: period.endDate.toISOString(),
        convertedLeads: result[`${period.label}ConvertedLeads`]?.aggregate?.count || 0,
        contactsWithAccounts: result[`${period.label}ContactsWithAccounts`]?.aggregate?.count || 0,
        wonOpportunities: result[`${period.label}WonOpportunities`]?.aggregate?.count || 0,
        managedAccounts: result[`${period.label}ManagedAccounts`]?.aggregate?.count || 0
      }))

      setTrendsData(dataPoints)
    } catch (err) {
      console.error('Error fetching performance trends:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch performance trends'))
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, context.accessToken, timeFilter, graphqlClient, generatePeriods])

  const refetch = useCallback(() => {
    fetchTrendsData().catch(() => undefined)
  }, [fetchTrendsData])

  useEffect(() => {
    fetchTrendsData().catch(() => undefined)
  }, [fetchTrendsData])

  return {
    trendsData,
    isLoading,
    error,
    refetch
  }
}
