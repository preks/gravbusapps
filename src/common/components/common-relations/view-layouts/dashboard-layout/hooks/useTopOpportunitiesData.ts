import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopOpportunityItem {
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

export interface TopOpportunitiesConfig {
  opportunityTable: string
  pipelineStageField: string
  pipelineStageRefField: string
  statusField?: string // Optional - only used in CRM
}

export interface UseTopOpportunitiesDataProps {
  accessToken: string
  enabled: boolean
  config: TopOpportunitiesConfig
  selectedCurrency: string
  limit?: number
}

export interface UseTopOpportunitiesDataReturn {
  opportunities: TopOpportunityItem[]
  isLoading: boolean
  error: string | null
  refetch: (currency?: string) => void
}

/**
 * Generic hook for fetching top opportunities (highest estimated amounts)
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
 * const { opportunities, isLoading, error, refetch } = useTopOpportunitiesData({
 *   accessToken: context.accessToken,
 *   enabled: true,
 *   config: topOpportunitiesConfig,
 *   selectedCurrency: 'EUR',
 *   limit: 5
 * })
 *
 * @example IRM
 * const { opportunities, isLoading, error, refetch } = useTopOpportunitiesData({
 *   accessToken: context.accessToken,
 *   enabled: true,
 *   config: topOpportunitiesConfig,
 *   selectedCurrency: 'USD',
 *   limit: 5
 * })
 */
export const useTopOpportunitiesData = ({
  accessToken,
  enabled,
  config,
  selectedCurrency,
  limit = 5
}: UseTopOpportunitiesDataProps): UseTopOpportunitiesDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [opportunities, setOpportunities] = useState<TopOpportunityItem[]>([])
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
        query GetTopOpportunities(
          $currentYearStart: timestamp!
          $currentYearEnd: timestamp!
          $currencyFilter: String!
          $limit: Int!
        ) {
          topOpportunities: ${config.opportunityTable}(
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
          topOpportunities: any[]
        }>(query, {
          currentYearStart,
          currentYearEnd,
          currencyFilter,
          limit
        })

        const fetchedOpportunities = result.topOpportunities || []

        // Normalize the data structure
        const normalizedOpportunities: TopOpportunityItem[] = fetchedOpportunities.map((opportunity: any) => ({
          id: opportunity.id,
          name: opportunity.name,
          estimatedAmount: opportunity.estimatedAmount,
          currencyRef: opportunity.currencyRef,
          closeDate: opportunity.closeDate,
          status: opportunity.status,
          ownerEmployeeId: opportunity.ownerEmployeeId,
          ownerEmployee: opportunity.ownerEmployee,
          pipelineStage: opportunity[config.pipelineStageField],
          pipelineStageRef: opportunity[config.pipelineStageRefField]
        }))

        setOpportunities(normalizedOpportunities)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch top opportunities'
        setError(errorMessage)
        console.error(`❌ Error fetching top opportunities:`, err)
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
    opportunities,
    isLoading,
    error,
    refetch
  }
}
