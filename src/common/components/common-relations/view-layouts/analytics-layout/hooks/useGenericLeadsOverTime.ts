import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { generateTimePeriods, TimeFilter } from '@/common/utils/analytics/dateRangeUtils'

export interface LeadsOverTimePoint {
  date: string
  count: number
  leadsCreated: number
  leadsConverted: number
  leadsLost: number
}

export interface LeadStatusCatalogEntry {
  code: string
  value: string
  id: string
}

export interface LeadsEntityConfig {
  entityName: string // "Lead" or "InvestmentLead"
  entityAggregate: string // "LeadAggregate" or "InvestmentLeadAggregate"
}

// ============================================================================
// HELPER FUNCTIONS - Reduce nesting depth
// ============================================================================

/** Build status query for a period */
function buildStatusQuery(
  statusCodes: string[],
  period: { start: string; end: string },
  prefix: string,
  entityAggregate: string
): string {
  return statusCodes
    .map(code => {
      const safeCode = code.replace(/\W/g, '_')
      return `
            ${prefix}_status_${safeCode}: ${entityAggregate}(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
                leadStatus: {code: {_eq: "${code}"}}
              }
            ) { aggregate { count } }
          `
    })
    .join('\n')
}

/** Count leads by status code for a period */
function countLeadsByStatusCode(
  result: any,
  allStatusCodes: LeadStatusCatalogEntry[],
  statusCodeToMatch: string,
  prefix: string
): number {
  return allStatusCodes
    .filter(s => s.code.toUpperCase() === statusCodeToMatch.toUpperCase())
    .reduce((sum, status) => {
      const safeCode = status.code.replace(/\W/g, '_')
      const count = result[`${prefix}_status_${safeCode}`]?.aggregate?.count || 0
      return sum + count
    }, 0)
}

export const useGenericLeadsOverTime = (
  accessToken: string,
  config: LeadsEntityConfig,
  timeFilter: TimeFilter = 'quarter',
  statusCatalogCodes?: LeadStatusCatalogEntry[] // Optional: pass from useLeadsStaticData to avoid duplicate fetch
) => {
  const [leadsOverTime, setLeadsOverTime] = useState<LeadsOverTimePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchLeadsOverTime = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Use provided status codes or fetch from database
        let allStatusCodes: LeadStatusCatalogEntry[]

        if (statusCatalogCodes && statusCatalogCodes.length > 0) {
          // Use passed status codes to avoid duplicate database fetch
          allStatusCodes = statusCatalogCodes
        } else {
          // Fallback: Fetch distinct statuses from database
          const distinctStatusQuery = `
            query GetDistinctLeadStatuses {
              distinctStatuses: ${config.entityName}(
                where: {isDeleted: {_eq: false}, leadStatus: {id: {_isNull: false}}}
                distinctOn: [leadStatusRef]
              ) {
                leadStatus {
                  id
                  code
                  value
                }
              }
            }
          `

          const distinctResult = await graphqlClient.request(distinctStatusQuery)
          allStatusCodes = (distinctResult.distinctStatuses || []).map((item: any) => ({
            code: item.leadStatus.code,
            value: item.leadStatus.value,
            id: item.leadStatus.id
          }))
        }

        // Step 2: Generate time periods
        const periods = generateTimePeriods(timeFilter)

        // Extract status codes once (avoid nested function depth)
        const statusCodes = allStatusCodes.map(s => s.code)

        // Step 3: Build comprehensive query for all periods
        const periodQueries = periods.map((period, index) => {
          const prefix = `period${index}`
          const statusQuery = buildStatusQuery(statusCodes, period, prefix, config.entityAggregate)

          return `
          # Period ${index + 1}: ${period.label}
          ${prefix}_total: ${config.entityAggregate}(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) { aggregate { count } }
          
          ${statusQuery}
        `
        })

        const query = `
          query GetLeadsOverTime {
            ${periodQueries.join('\n\n')}
          }
        `

        const result = await graphqlClient.request(query)

        // Step 4: Transform results into time series data
        const leadsOverTimeData: LeadsOverTimePoint[] = periods.map((period, index) => {
          const prefix = `period${index}`
          const totalLeads = result[`${prefix}_total`]?.aggregate?.count || 0

          // Count leads by status for this period using helper function
          const convertedCount = countLeadsByStatusCode(result, allStatusCodes, 'CONVERTED', prefix)
          const lostCount = countLeadsByStatusCode(result, allStatusCodes, 'LOST', prefix)

          return {
            date: period.label, // Use period label directly
            count: totalLeads,
            leadsCreated: totalLeads,
            leadsConverted: convertedCount,
            leadsLost: lostCount
          }
        })

        setLeadsOverTime(leadsOverTimeData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leads over time')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchLeadsOverTime()
    }
  }, [accessToken, timeFilter, config.entityName, config.entityAggregate, graphqlClient])

  return { leadsOverTime, isLoading, error }
}
