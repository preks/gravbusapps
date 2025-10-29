import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'

// Use InvestmentOpportunity directly but extend with display fields
export interface SoldOpportunity extends InvestmentOpportunity {
  displayValue?: string // Override for "Sold" display
}

export interface SalesMetrics {
  totalSold: number
  totalRevenue: number
  averageRevenue: number
  averageWinRate: number
}

export interface UseSalesDataReturn {
  soldOpportunities: SoldOpportunity[]
  metrics: SalesMetrics | null
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any,
    overrideSortField?: string,
    overrideSortOrder?: 'ASC' | 'DESC' | ''
  ) => Promise<void>
  loadMore: () => void
  retry: () => void
}

interface UseSalesDataParams {
  search?: string
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  context: BusinessAppContextProps
}

const transformSoldOpportunityData = (investmentOpportunity: InvestmentOpportunity): SoldOpportunity => {
  return {
    ...investmentOpportunity,
    // Override WON status to display as "Sold"
    displayValue:
      investmentOpportunity.opportunityStatus?.value === 'WON' ? 'Sold' : investmentOpportunity.opportunityStatus?.value
  }
}

export const useSalesData = (params: UseSalesDataParams): UseSalesDataReturn => {
  const [soldOpportunities, setSoldOpportunities] = useState<SoldOpportunity[]>([])
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(params.context)

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: {
        search?: string
        ownerEmployeeIds?: string[]
        closeDateFrom?: string
        closeDateTo?: string
      },
      overrideSortField?: string,
      overrideSortOrder?: 'ASC' | 'DESC' | ''
    ) => {
      if (!params.context.accessToken) {
        console.warn('No access token provided for sales data loading')
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build query variables for InvestmentOpportunity
        const variables: InvestmentOpportunityQueryVariables = {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          dealType: 'DIVESTMENT_DEAL', // Filter for divestment opportunities
          search: additionalFilters?.search || params.search,
          ownerEmployeeIds: additionalFilters?.ownerEmployeeIds,
          closeDateFrom: additionalFilters?.closeDateFrom,
          closeDateTo: additionalFilters?.closeDateTo
        }

        // Add sorting
        const sortField = overrideSortField || params.sortField
        const sortOrder = overrideSortOrder || params.sortOrder

        if (sortField && sortField !== '' && sortOrder) {
          variables.orderBy = [
            {
              field: sortField,
              direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          ]
        }

        // Fetch using InvestmentOpportunity API
        const result = await fetchInvestmentOpportunities(variables)

        if (result?.InvestmentOpportunity) {
          // Filter for WON opportunities - check multiple possible status fields and values
          const wonOpportunities = result.InvestmentOpportunity.filter(opp => {
            const statusValue = opp.opportunityStatus?.value?.toUpperCase()
            const statusCode = opp.opportunityStatus?.code?.toUpperCase()
            const statusAltCode = opp.opportunityStatus?.alternativeCode?.toUpperCase()
            const directStatus = opp.status?.toUpperCase()

            // Check for various "WON" representations
            const wonVariations = ['WON', 'CLOSED WON', 'SOLD', 'SUCCESS', 'COMPLETED']

            return wonVariations.some(
              variation =>
                statusValue === variation ||
                statusCode === variation ||
                statusAltCode === variation ||
                directStatus === variation ||
                statusValue?.includes('WON') ||
                statusCode?.includes('WON') ||
                statusAltCode?.includes('WON') ||
                directStatus?.includes('WON')
            )
          })

          const transformedOpportunities = wonOpportunities.map(transformSoldOpportunityData)
          setSoldOpportunities(transformedOpportunities)

          // Use the filtered count since we filter by WON status
          const totalCount = wonOpportunities.length
          setTotal(totalCount)
          setHasMore(page * pageSize < totalCount)

          // Calculate metrics from the WON opportunities
          const totalValue = wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
          const averageValue = wonOpportunities.length > 0 ? totalValue / wonOpportunities.length : 0
          const averageWinRate =
            wonOpportunities.length > 0
              ? wonOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / wonOpportunities.length
              : 0

          const metricsData: SalesMetrics = {
            totalSold: totalCount,
            totalRevenue: totalValue,
            averageRevenue: averageValue,
            averageWinRate: averageWinRate
          }
          setMetrics(metricsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load sales data'))
        console.error('Error loading sales data:', err)
      } finally {
        setLoading(false)
      }
    },
    [fetchInvestmentOpportunities, params.search, params.sortField, params.sortOrder, params.context.accessToken]
  )

  const loadMore = useCallback(() => {
    console.log('Load more sales data requested')
    // Implementation for infinite scroll if needed
  }, [])

  const retry = useCallback(() => {
    console.log('Retrying sales data load')
    // Will be implemented with actual retry logic
  }, [])

  return {
    soldOpportunities,
    metrics,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  }
}
