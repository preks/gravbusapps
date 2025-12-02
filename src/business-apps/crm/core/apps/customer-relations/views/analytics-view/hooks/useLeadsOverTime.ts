import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface LeadsOverTimePoint {
  date: string
  count: number
  leadsCreated: number
  leadsConverted: number
  leadsLost: number
  [key: string]: number | string // Allow dynamic status keys
}

export interface LeadStatusCatalogEntry {
  code: string
  value: string
  id: string
}

export const useLeadsOverTime = (
  accessToken: string,
  timeFilter: TimeFilter = 'quarter',
  statusCatalogCodes?: LeadStatusCatalogEntry[] // Optional: pass from useLeadsStaticData to avoid duplicate fetch
) => {
  const [leadsOverTime, setLeadsOverTime] = useState<LeadsOverTimePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  useEffect(() => {
    const fetchLeadsOverTime = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Use provided status codes or fetch from catalog
        let allStatusCodes: LeadStatusCatalogEntry[]

        if (statusCatalogCodes && statusCatalogCodes.length > 0) {
          // Use passed status codes to avoid duplicate catalog fetch
          allStatusCodes = statusCatalogCodes
        } else {
          // Fallback: Fetch from catalog if not provided
          const catalogResponse = await catalogClient.getCatalogEntriesList(
            {
              catalogIdentifier: 'SalesLeadStatus',
              version: 'v1'
            },
            {
              limit: 100,
              offset: 0,
              returnTotalRecords: true,
              includeChildCatalogEntries: true
            }
          )

          const leadStatuses = catalogResponse.data || []
          allStatusCodes = leadStatuses.map((status: any) => ({
            code: status.code,
            value: status.value || status.label || status.name,
            id: status.id
          }))
        }

        // Generate time periods based on the selected filter
        const periods = generateTimePeriods(timeFilter)

        // Build queries for each period and each status
        const queries = periods.map((period, index) => {
          // Create aggregate query for each status
          const statusQueries = allStatusCodes
            .map(status => {
              const safeStatusCode = status.code.replace(/[^a-zA-Z0-9_]/g, '_') // Make safe for GraphQL alias
              return `
          # Leads with status '${status.value}' in period
          status_${safeStatusCode}_period${index}: LeadAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              leadStatus: {code: {_eq: "${status.code}"}}
            }
          ) {
            aggregate { count }
          }`
            })
            .join('\n')

          return `
          # Total leads created in period
          createdPeriod${index}: LeadAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) {
            aggregate { count }
          }
          ${statusQueries}
        `
        })

        const query = `
          query GetLeadsOverTime {
            ${queries.join('\n')}
          }
        `

        const result = await graphqlClient.request(query)

        // Transform results to chart data
        const trends = periods.map((period, index) => {
          const leadsCreated = result[`createdPeriod${index}`]?.aggregate?.count || 0

          // Collect counts for all statuses dynamically
          const statusCounts: { [key: string]: number } = {}
          let leadsConverted = 0
          let leadsLost = 0

          allStatusCodes.forEach(status => {
            const safeStatusCode = status.code.replace(/[^a-zA-Z0-9_]/g, '_')
            const count = result[`status_${safeStatusCode}_period${index}`]?.aggregate?.count || 0

            // Store with readable key (status value)
            const statusKey = status.value.replace(/[^a-zA-Z0-9]/g, '')
            statusCounts[statusKey] = count

            // Backward compatibility: identify converted and lost statuses
            const codeUpper = status.code?.toUpperCase() || ''
            const valueUpper = status.value?.toUpperCase() || ''

            if (
              codeUpper.includes('CONVERTED') ||
              codeUpper.includes('QUALIFIED') ||
              valueUpper.includes('CONVERTED') ||
              valueUpper.includes('QUALIFIED')
            ) {
              leadsConverted += count
            }

            if (
              codeUpper.includes('LOST') ||
              codeUpper.includes('DEAD') ||
              codeUpper.includes('REJECTED') ||
              valueUpper.includes('LOST') ||
              valueUpper.includes('DEAD') ||
              valueUpper.includes('REJECTED')
            ) {
              leadsLost += count
            }
          })

          return {
            date: period.start,
            count: leadsCreated,
            leadsCreated,
            leadsConverted, // Backward compatibility
            leadsLost, // Backward compatibility
            ...statusCounts // All individual status counts
          }
        })

        setLeadsOverTime(trends)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchLeadsOverTime()
    }
  }, [accessToken, graphqlClient, timeFilter])

  return { leadsOverTime, isLoading, error }
}

// Helper function to generate time periods
const generateTimePeriods = (filter: TimeFilter): Array<{ start: string; end: string; label: string }> => {
  const now = new Date()
  const periods: Array<{ start: string; end: string; label: string }> = []

  switch (filter) {
    case 'month': {
      // Last 30 days (daily)
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      }
      break
    }

    case 'quarter': {
      // Last 3 months (weekly)
      const weeksInQuarter = 12
      for (let i = weeksInQuarter - 1; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - i * 7 - (i === weeksInQuarter - 1 ? 0 : 7))
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `Week ${weeksInQuarter - i}`
        })
      }
      break
    }

    case 'sixMonths': {
      // Last 6 months (weekly)
      const weeksInSixMonths = 26
      for (let i = weeksInSixMonths - 1; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - i * 7 - (i === weeksInSixMonths - 1 ? 0 : 7))
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      }
      break
    }

    case 'year': {
      // Last 12 months (monthly)
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

        periods.push({
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
          label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      }
      break
    }

    case 'historical': {
      // Last 5 years (yearly)
      const currentYear = now.getFullYear()
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
      return []
  }

  return periods
}
