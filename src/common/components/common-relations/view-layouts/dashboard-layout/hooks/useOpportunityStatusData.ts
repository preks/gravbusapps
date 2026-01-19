import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

dayjs.extend(quarterOfYear)

export interface OpportunityStatusConfig {
  opportunityTable: string
  opportunityAggregateTable: string
  opportunityStatusField: string
  opportunityStatusRefField: string
}

export interface OpportunityStatusDataItem {
  status: string
  statusRef: string | null
  count: number
  totalAmount: number
}

export interface UseOpportunityStatusDataParams {
  accessToken: string
  enabled: boolean
  config: OpportunityStatusConfig
}

export interface UseOpportunityStatusDataReturn {
  opportunityStatuses: OpportunityStatusDataItem[]
  totalOpportunityCount: number
  openOpportunitiesComparison: {
    beforeCurrentQuarter: number
    currentQuarter: number
  }
  isLoading: boolean
  error: string | null
}

/**
 * Hook for fetching opportunity status data for the current quarter
 * Returns aggregated data of opportunities grouped by status
 */
export const useOpportunityStatusData = ({
  accessToken,
  enabled,
  config
}: UseOpportunityStatusDataParams): UseOpportunityStatusDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [opportunityStatuses, setOpportunityStatuses] = useState<OpportunityStatusDataItem[]>([])
  const [totalOpportunityCount, setTotalOpportunityCount] = useState(0)
  const [openOpportunitiesComparison, setOpenOpportunitiesComparison] = useState<{
    beforeCurrentQuarter: number
    currentQuarter: number
  }>({ beforeCurrentQuarter: 0, currentQuarter: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!accessToken || !enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Calculate current quarter date range
      const now = dayjs()
      const quarterStart = now.startOf('quarter').toISOString()
      const quarterEnd = now.endOf('quarter').toISOString()

      // Query to get distinct statuses for current quarter
      const distinctStatusesQuery = `
        query GetDistinctOpportunityStatuses(
          $startDate: timestamptz!
          $endDate: timestamptz!
        ) {
          distinctStatuses: ${config.opportunityTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
            }
            distinctOn: [${config.opportunityStatusRefField}]
          ) {
            ${config.opportunityStatusRefField}
            ${config.opportunityStatusField} {
              code
              value
            }
          }
        }
      `

      const distinctStatusesResult: any = await graphqlClient.request(distinctStatusesQuery, {
        startDate: quarterStart,
        endDate: quarterEnd
      })

      const statuses = distinctStatusesResult.distinctStatuses || []

      // Process statuses including "Unknown" for null values - temporary structure
      interface ProcessedStatus {
        statusRef: string | null
        statusCode: string
        statusValue: string
        alias: string
      }

      const processedStatuses: ProcessedStatus[] = [
        ...statuses,
        {
          [config.opportunityStatusRefField]: null,
          [config.opportunityStatusField]: { code: 'UNKNOWN', value: 'Unknown' }
        }
      ]
        .map((status: any) => {
          const statusRef = status[config.opportunityStatusRefField] || null
          const statusCode = status[config.opportunityStatusField]?.code || 'UNKNOWN'
          const statusValue = status[config.opportunityStatusField]?.value || 'Unknown'
          const alias = statusCode.replace(/\W/g, '_')

          return {
            statusRef,
            statusCode,
            statusValue,
            alias
          }
        })
        .filter((status, index, self) => {
          // Remove duplicates by statusRef
          return index === self.findIndex(s => s.statusRef === status.statusRef)
        })

      // Build aggregate query for each status
      const statusAggregates = processedStatuses
        .map(status => {
          const statusFilter = status.statusRef
            ? `${config.opportunityStatusRefField}: { _eq: "${status.statusRef}" }`
            : `${config.opportunityStatusRefField}: { _isNull: true }`

          return `
            ${status.alias}: ${config.opportunityAggregateTable}(
              where: {
                createdAt: { _gte: $startDate, _lte: $endDate }
                isDeleted: { _eq: false }
                ${statusFilter}
              }
            ) {
              aggregate {
                count
                sum {
                  estimatedAmount
                }
              }
            }
          `
        })
        .join('\n')

      const aggregateQuery = `
        query GetOpportunityStatusAggregates(
          $startDate: timestamptz!
          $endDate: timestamptz!
        ) {
          ${statusAggregates}
          
          totalCount: ${config.opportunityAggregateTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const aggregateResult: any = await graphqlClient.request(aggregateQuery, {
        startDate: quarterStart,
        endDate: quarterEnd
      })

      // Process aggregate results
      const statusData: OpportunityStatusDataItem[] = processedStatuses
        .map((processedStatus: ProcessedStatus) => {
          const aggregateData = aggregateResult[processedStatus.alias]
          const count = aggregateData?.aggregate?.count || 0
          const totalAmount = aggregateData?.aggregate?.sum?.estimatedAmount || 0

          return {
            status: processedStatus.statusValue,
            statusRef: processedStatus.statusRef,
            count,
            totalAmount
          }
        })
        .filter(item => item.count > 0) // Only include statuses with at least 1 opportunity
        .sort((a, b) => b.count - a.count) // Sort by count descending

      const totalCount = aggregateResult.totalCount?.aggregate?.count || 0

      // Fetch comparison data for OPEN opportunities: before current quarter vs current quarter
      // Filter by opportunityStatus.type = "OPEN" instead of full reference
      const openComparisonQuery = `
        query GetOpenOpportunitiesComparison(
          $quarterStart: timestamptz!
          $quarterEnd: timestamptz!
        ) {
          beforeQuarter: ${config.opportunityAggregateTable}(
            where: {
              createdAt: { _lt: $quarterStart }
              isDeleted: { _eq: false }
              ${config.opportunityStatusField}: { type: { _eq: "OPEN" } }
            }
          ) {
            aggregate {
              count
            }
          }
          currentQuarter: ${config.opportunityAggregateTable}(
            where: {
              createdAt: { _gte: $quarterStart, _lte: $quarterEnd }
              isDeleted: { _eq: false }
              ${config.opportunityStatusField}: { type: { _eq: "OPEN" } }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const openComparisonResult: any = await graphqlClient.request(openComparisonQuery, {
        quarterStart,
        quarterEnd
      })

      const beforeQuarterCount = openComparisonResult.beforeQuarter?.aggregate?.count || 0
      const currentQuarterCount = openComparisonResult.currentQuarter?.aggregate?.count || 0

      setOpportunityStatuses(statusData)
      setTotalOpportunityCount(totalCount)
      setOpenOpportunitiesComparison({
        beforeCurrentQuarter: beforeQuarterCount,
        currentQuarter: currentQuarterCount
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load opportunity status data'
      setError(errorMessage)
      console.error('Error fetching opportunity status data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, config])

  useEffect(() => {
    if (enabled) {
      void fetchData()
    }
  }, [enabled, fetchData])

  return {
    opportunityStatuses,
    totalOpportunityCount,
    openOpportunitiesComparison,
    isLoading,
    error
  }
}
