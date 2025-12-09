import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { generateTimePeriods, TimeFilter } from '@/common/utils/analytics/dateRangeUtils'

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

        // Helper function to build status query for a period
        const buildStatusQuery = (
          status: LeadStatusCatalogEntry,
          periodIndex: number,
          periodStart: string,
          periodEnd: string
        ): string => {
          const safeStatusCode = status.code.replace(/\W/g, '_')
          return `
          # Leads with status '${status.value}' in period
          status_${safeStatusCode}_period${periodIndex}: LeadAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${periodStart}", _lt: "${periodEnd}"}
              leadStatus: {code: {_eq: "${status.code}"}}
            }
          ) {
            aggregate { count }
          }`
        }

        // Helper function to build period query
        const buildPeriodQuery = (
          period: { start: string; end: string; label: string },
          index: number,
          statusCodes: LeadStatusCatalogEntry[]
        ): string => {
          const statusQueries = statusCodes
            .map(status => buildStatusQuery(status, index, period.start, period.end))
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
        }

        // Generate time periods based on the selected filter
        const periods = generateTimePeriods(timeFilter)

        // Build queries for each period and each status
        const queries = periods.map((period, index) => buildPeriodQuery(period, index, allStatusCodes))

        const query = `
          query GetLeadsOverTime {
            ${queries.join('\n')}
          }
        `

        const result = await graphqlClient.request(query)

        // Helper function to check if status is converted
        const isConvertedStatus = (status: LeadStatusCatalogEntry): boolean => {
          const codeUpper = status.code?.toUpperCase() || ''
          const valueUpper = status.value?.toUpperCase() || ''
          return (
            codeUpper.includes('CONVERTED') ||
            codeUpper.includes('QUALIFIED') ||
            valueUpper.includes('CONVERTED') ||
            valueUpper.includes('QUALIFIED')
          )
        }

        // Helper function to check if status is lost
        const isLostStatus = (status: LeadStatusCatalogEntry): boolean => {
          const codeUpper = status.code?.toUpperCase() || ''
          const valueUpper = status.value?.toUpperCase() || ''
          return (
            codeUpper.includes('LOST') ||
            codeUpper.includes('DEAD') ||
            codeUpper.includes('REJECTED') ||
            valueUpper.includes('LOST') ||
            valueUpper.includes('DEAD') ||
            valueUpper.includes('REJECTED')
          )
        }

        // Helper function to process status counts for a period
        const processStatusCounts = (
          periodIndex: number,
          statusCodes: LeadStatusCatalogEntry[]
        ): {
          statusCounts: { [key: string]: number }
          leadsConverted: number
          leadsLost: number
        } => {
          const statusCounts: { [key: string]: number } = {}
          let leadsConverted = 0
          let leadsLost = 0

          statusCodes.forEach(status => {
            const safeStatusCode = status.code.replace(/\W/g, '_')
            const count = result[`status_${safeStatusCode}_period${periodIndex}`]?.aggregate?.count || 0

            const statusKey = status.value.replace(/[\W_]/g, '')
            statusCounts[statusKey] = count

            if (isConvertedStatus(status)) {
              leadsConverted += count
            }
            if (isLostStatus(status)) {
              leadsLost += count
            }
          })

          return { statusCounts, leadsConverted, leadsLost }
        }

        // Transform results to chart data
        const trends = periods.map((period, index) => {
          const leadsCreated = result[`createdPeriod${index}`]?.aggregate?.count || 0
          const { statusCounts, leadsConverted, leadsLost } = processStatusCounts(index, allStatusCodes)

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
