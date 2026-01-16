import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface LeadSourceDataItem {
  source: string
  sourceRef: string
  sourceCode: string
  value: number
  percentage: number
  convertedCount: number
  conversionRate: number
  qualityLevel?: 'high' | 'medium' | 'low'
  qualityIndicator?: string
  qualityText?: string
  color?: string
}

export interface LeadSourceConfig {
  leadTable: string
  leadAggregateTable: string
  leadStatusPrefix: string // e.g., 'SalesLeadStatus' for CRM, 'InvestmentLeadStatus' for IRM
}

export interface UseLeadSourceDataProps {
  accessToken: string
  startDate: string
  endDate: string
  enabled?: boolean
  config: LeadSourceConfig
}

export interface UseLeadSourceDataReturn {
  leadSources: LeadSourceDataItem[]
  totalLeadCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generic hook for fetching lead source data for CURRENT MONTH
 * Module-agnostic - accepts configuration for any module
 *
 * Shows OPEN leads created in the CURRENT MONTH (auto-calculated)
 *
 * Uses optimized server-side aggregation:
 * 1. Calculate current month start/end dates automatically
 * 2. Fetch distinct lead sources from OPEN leads in current month
 * 3. Build dynamic aggregate query for all sources in parallel
 * 4. Calculate conversion rates and quality metrics
 *
 * @param accessToken - Authentication token
 * @param startDate - (IGNORED - kept for backward compatibility)
 * @param endDate - (IGNORED - kept for backward compatibility)
 * @param enabled - Whether to automatically fetch data (defaults to true)
 * @param config - Configuration with table names
 */
export const useLeadSourceData = ({
  accessToken,
  startDate: _startDate, // eslint-disable-line @typescript-eslint/no-unused-vars
  endDate: _endDate, // eslint-disable-line @typescript-eslint/no-unused-vars
  enabled = true,
  config
}: UseLeadSourceDataProps): UseLeadSourceDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [leadSources, setLeadSources] = useState<LeadSourceDataItem[]>([])
  const [totalLeadCount, setTotalLeadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Always use current month (not the passed dateRange) - use UTC to avoid timezone issues
      const now = new Date()
      const year = now.getUTCFullYear()
      const month = now.getUTCMonth()

      // Create dates in UTC to avoid timezone conversion issues
      const currentMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString()
      const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString()

      // Step 1: Get distinct lead sources (OPEN leads created in date range)
      // Include leads with AND without sources
      const openStatusRef = `${config.leadStatusPrefix}:v1:OPEN`
      const convertedStatusRef = `${config.leadStatusPrefix}:v1:CONVERTED`

      const distinctSourcesQuery = `
        query GetDistinctLeadSources(
          $startDate: timestamptz!
          $endDate: timestamptz!
        ) {
          distinctSources: ${config.leadTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
              leadStatusRef: { _eq: "${openStatusRef}" }
            }
            distinctOn: [leadSourceRef]
          ) {
            leadSourceRef
            leadSource {
              code
              value
            }
          }
        }
      `

      const sourcesResult = await graphqlClient.request<any>(distinctSourcesQuery, {
        startDate: currentMonthStart,
        endDate: currentMonthEnd
      })

      const sources = sourcesResult.distinctSources || []

      if (sources.length === 0) {
        setLeadSources([])
        setTotalLeadCount(0)
        return
      }

      // Map sources and add "Unknown" for null sources
      const sourcesWithUnknown = sources.map((source: any) => {
        if (!source.leadSourceRef || !source.leadSource) {
          // Handle leads without a source
          return {
            leadSourceRef: null,
            leadSource: {
              code: 'UNKNOWN',
              value: 'Unknown'
            }
          }
        }
        return source
      })

      // Step 2: Build dynamic aggregate query for all sources
      // Each source gets THREE aggregates:
      // 1. OPEN leads count (created in date range) - for display
      // 2. TOTAL leads count (all statuses, created in date range) - for conversion rate denominator
      // 3. CONVERTED leads count (created in date range) - for conversion rate numerator
      const aggregateSelections = sourcesWithUnknown
        .map((source: any) => {
          const alias = (source.leadSource.code || 'UNKNOWN').replace(/\W/g, '_')

          // Build filter for source - handle null sources (Unknown)
          const sourceFilter = source.leadSourceRef
            ? `leadSourceRef: { _eq: "${source.leadSourceRef}" }`
            : `leadSourceRef: { _isNull: true }`

          return `
          ${alias}_open: ${config.leadAggregateTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
              ${sourceFilter}
              leadStatusRef: { _eq: "${openStatusRef}" }
            }
          ) {
            aggregate {
              count
            }
          }
          ${alias}_total: ${config.leadAggregateTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
              ${sourceFilter}
            }
          ) {
            aggregate {
              count
            }
          }
          ${alias}_converted: ${config.leadAggregateTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
              ${sourceFilter}
              leadStatusRef: { _eq: "${convertedStatusRef}" }
            }
          ) {
            aggregate {
              count
            }
          }
        `
        })
        .join('\n')

      const aggregatesQuery = `
        query GetLeadSourceAggregates(
          $startDate: timestamptz!
          $endDate: timestamptz!
        ) {
          ${aggregateSelections}
          
          # Total OPEN lead count created in date range (all sources combined, including leads without a source)
          totalCount: ${config.leadAggregateTable}(
            where: {
              createdAt: { _gte: $startDate, _lte: $endDate }
              isDeleted: { _eq: false }
              leadStatusRef: { _eq: "${openStatusRef}" }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const aggregatesResult = await graphqlClient.request<any>(aggregatesQuery, {
        startDate: currentMonthStart,
        endDate: currentMonthEnd
      })

      const totalCount = aggregatesResult.totalCount?.aggregate?.count || 0

      // Step 3: Process results and calculate metrics
      const processedSources: LeadSourceDataItem[] = sourcesWithUnknown
        .map((source: any) => {
          const alias = (source.leadSource.code || 'UNKNOWN').replace(/\W/g, '_')
          const openCount = aggregatesResult[`${alias}_open`]?.aggregate?.count || 0
          const totalCountForSource = aggregatesResult[`${alias}_total`]?.aggregate?.count || 0
          const convertedCount = aggregatesResult[`${alias}_converted`]?.aggregate?.count || 0

          // Conversion rate: (converted / total all statuses) × 100
          const conversionRate = totalCountForSource > 0 ? Math.round((convertedCount / totalCountForSource) * 100) : 0
          // Percentage of open leads from this source
          const percentage = totalCount > 0 ? Math.round((openCount / totalCount) * 100) : 0

          // Quality indicators based on OPEN lead volume
          let qualityLevel: 'high' | 'medium' | 'low'
          let qualityIndicator: string
          let qualityText: string

          if (openCount >= 10) {
            qualityLevel = 'high'
            qualityIndicator = '⭐'
            qualityText = getTranslationFromI18nKeyAndLabel('quality.highVolume', 'High volume')
          } else if (openCount < 5) {
            qualityLevel = 'low'
            qualityIndicator = '📉'
            qualityText = getTranslationFromI18nKeyAndLabel('quality.lowVolume', 'Low volume')
          } else {
            qualityLevel = 'medium'
            qualityIndicator = '📈'
            qualityText = getTranslationFromI18nKeyAndLabel('quality.active', 'Active')
          }

          return {
            source: source.leadSource.value,
            sourceRef: source.leadSourceRef,
            sourceCode: source.leadSource.code,
            value: openCount, // Display OPEN leads count
            percentage,
            convertedCount,
            conversionRate,
            qualityLevel,
            qualityIndicator,
            qualityText
          }
        })
        .filter((s: LeadSourceDataItem) => s.value > 0) // Only show sources with open leads
        .sort((a: LeadSourceDataItem, b: LeadSourceDataItem) => b.value - a.value)

      setLeadSources(processedSources)
      setTotalLeadCount(totalCount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch lead source data'
      setError(errorMessage)
      console.error(' Error fetching lead source data:', err)
      console.error(' Full error details:', JSON.stringify(err, null, 2))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, config, graphqlClient])

  useEffect(() => {
    if (enabled) {
      void fetchData()
    }
  }, [enabled, accessToken, config, fetchData])

  return {
    leadSources,
    totalLeadCount,
    isLoading,
    error,
    refetch: () => {
      fetchData()
    }
  }
}
