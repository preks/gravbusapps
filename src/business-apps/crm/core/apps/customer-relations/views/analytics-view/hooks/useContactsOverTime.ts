import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactsOverTimePoint {
  date: string
  contactsCreated: number
}

export type ContactsTimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

/**
 * Fetches Contact Lifecycle data using dynamic aggregate queries per time period
 * Pattern: Exactly matches useLeadsOverTime
 */
export const useContactsOverTime = (accessToken: string, selectedTimeFilter: ContactsTimeFilter) => {
  const [contactsOverTime, setContactsOverTime] = useState<ContactsOverTimePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchContactsOverTime = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Generate time periods based on selected filter
        const periods = generateTimePeriods(selectedTimeFilter)

        // Build aggregate queries for each period
        const aggregateQueries = periods
          .map((period, index) => {
            return `
            period_${index}_created: ContactAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              }
            ) {
              aggregate { count }
            }
          `
          })
          .join('\n')

        const query = `
          query GetContactsOverTime {
            ${aggregateQueries}
          }
        `

        const result = await graphqlClient.request(query)

        // Process results
        const contactsOverTimeData: ContactsOverTimePoint[] = periods.map((period, index) => ({
          date: period.label,
          contactsCreated: result[`period_${index}_created`]?.aggregate?.count || 0
        }))

        setContactsOverTime(contactsOverTimeData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactsOverTime()
  }, [accessToken, selectedTimeFilter, graphqlClient])

  return { contactsOverTime, isLoading, error }
}

/**
 * Generate time periods based on selected filter
 * Pattern: Matches useLeadsOverTime
 */
function generateTimePeriods(timeFilter: ContactsTimeFilter) {
  const now = new Date()
  const periods: Array<{ start: string; end: string; label: string }> = []

  switch (timeFilter) {
    case 'month': {
      // Last 4 weeks (weekly)
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now)
        end.setDate(now.getDate() - i * 7)
        const start = new Date(end)
        start.setDate(end.getDate() - 7)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toISOString()
        })
      }
      break
    }

    case 'quarter': {
      // Last 3 months (monthly)
      for (let i = 2; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = new Date(monthDate)
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toISOString()
        })
      }
      break
    }

    case 'sixMonths': {
      // Last 6 months (monthly)
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = new Date(monthDate)
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toISOString()
        })
      }
      break
    }

    case 'year': {
      // Last 12 months (monthly)
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = new Date(monthDate)
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toISOString()
        })
      }
      break
    }

    case 'historical': {
      // Last 5 years (yearly)
      const currentYear = now.getFullYear()
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i
        const start = new Date(year, 0, 1)
        const end = new Date(year + 1, 0, 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toISOString()
        })
      }
      break
    }
  }

  return periods
}
