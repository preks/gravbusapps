import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopDealItem {
  id: string
  name: string
  estimatedAmount: number
  currencyRef: string
  closeDate: string | null
  status: string | null
  ownerEmployeeId: string | null
  ownerEmployee: {
    id: string
    firstName: string
    lastName: string
  } | null
  pipelineStage: {
    id: string
    value: string
    code: string
  } | null
  pipelineStageRef: string | null
}

export interface TopDealsConfig {
  opportunityTable: string
  pipelineStageField: string
  pipelineStageRefField: string
  statusField?: string // Optional - only used in CRM
}

export interface UseTopDealsDataProps {
  accessToken: string
  enabled: boolean
  config: TopDealsConfig
  selectedCurrency: string
  limit?: number
}

export interface UseTopDealsDataReturn {
  deals: TopDealItem[]
  isLoading: boolean
  error: string | null
  refetch: (currency?: string) => void
}

/**
 * Generic hook for fetching top deals (highest estimated amounts)
 * Module-agnostic - accepts configuration for any module
 *
 * Features:
 * - Server-side filtering by currency and current year
 * - Sorted by estimated amount (DESC)
 * - Configurable limit (default: 5)
 * - Configurable table and field names
 * - Automatic refetch when currency changes
 *
 * @example CRM
 * const { deals, isLoading, error, refetch } = useTopDealsData({
 *   accessToken: context.accessToken,
 *   enabled: true,
 *   config: topDealsConfig,
 *   selectedCurrency: 'EUR',
 *   limit: 5
 * })
 *
 * @example IRM
 * const { deals, isLoading, error, refetch } = useTopDealsData({
 *   accessToken: context.accessToken,
 *   enabled: true,
 *   config: topDealsConfig,
 *   selectedCurrency: 'USD',
 *   limit: 5
 * })
 */
export const useTopDealsData = ({
  accessToken,
  enabled,
  config,
  selectedCurrency,
  limit = 5
}: UseTopDealsDataProps): UseTopDealsDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [deals, setDeals] = useState<TopDealItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track current currency to detect changes
  const currentCurrency = useRef(selectedCurrency)

  const fetchData = useCallback(
    async (currency: string = selectedCurrency) => {
      if (!enabled || !accessToken) {
        return
      }

      setIsLoading(true)
      setError(null)

      // Update current currency
      currentCurrency.current = currency

      try {
        // Calculate current year date range
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentYearStart = new Date(currentYear, 0, 1).toISOString()
        const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString()

        // Format currency filter
        const currencyFilter = currency.startsWith('Currency:') ? currency : `Currency:v1:${currency}`

        // Build GraphQL query dynamically
        const query = `
        query GetTopDeals(
          $currentYearStart: timestamp!
          $currentYearEnd: timestamp!
          $currencyFilter: String!
          $limit: Int!
        ) {
          topDeals: ${config.opportunityTable}(
            where: {
              isDeleted: { _eq: false }
              estimatedAmount: { _gt: 0 }
              closeDate: { _gte: $currentYearStart, _lte: $currentYearEnd }
              currencyRef: { _eq: $currencyFilter }
            }
            orderBy: { estimatedAmount: DESC }
            limit: $limit
          ) {
            id
            name
            estimatedAmount
            currencyRef
            ${config.pipelineStageRefField}
            closeDate
            ${config.statusField ? 'status' : ''}
            ownerEmployeeId
            ownerEmployee {
              id
              firstName
              lastName
            }
            ${config.pipelineStageField} {
              id
              value
              code
            }
          }
        }
      `

        const result = await graphqlClient.request<{
          topDeals: any[]
        }>(query, {
          currentYearStart,
          currentYearEnd,
          currencyFilter,
          limit
        })

        const fetchedDeals = result.topDeals || []

        // Normalize the data structure
        const normalizedDeals: TopDealItem[] = fetchedDeals.map((deal: any) => ({
          id: deal.id,
          name: deal.name,
          estimatedAmount: deal.estimatedAmount,
          currencyRef: deal.currencyRef,
          closeDate: deal.closeDate,
          status: deal.status,
          ownerEmployeeId: deal.ownerEmployeeId,
          ownerEmployee: deal.ownerEmployee,
          pipelineStage: deal[config.pipelineStageField],
          pipelineStageRef: deal[config.pipelineStageRefField]
        }))

        setDeals(normalizedDeals)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch top deals'
        setError(errorMessage)
        console.error(`❌ Error fetching top deals:`, err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, enabled, config, graphqlClient, limit, selectedCurrency]
  )

  useEffect(() => {
    if (enabled) {
      fetchData(selectedCurrency)
    }
  }, [enabled, selectedCurrency, fetchData])

  const refetch = useCallback(
    (currency?: string) => {
      const fetchCurrency = currency ?? currentCurrency.current
      fetchData(fetchCurrency)
    },
    [fetchData]
  )

  return {
    deals,
    isLoading,
    error,
    refetch
  }
}
