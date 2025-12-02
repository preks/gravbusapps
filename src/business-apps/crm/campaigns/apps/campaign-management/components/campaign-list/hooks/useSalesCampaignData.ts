import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesCampaignQueries } from './useSalesCampaignQueries'
import { SalesCampaignQueryVariables, SalesCampaign, SalesCampaignStatistics } from '../types/SalesCampaignTypes'

export interface ProcessFiltersParams {
  search: string
  selectedFilters: string[]
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC' | ''
  offset?: number
  limit?: number
}

export interface UseSalesCampaignDataReturn {
  campaigns: SalesCampaign[]
  isLoading: boolean
  error: string | null
  totalCount: number
  statistics: SalesCampaignStatistics | null
  isStatisticsLoading: boolean
  statisticsError: string | null
  refetch: () => void
  fetchCampaigns: (variables?: SalesCampaignQueryVariables) => Promise<void>
  processFiltersAndFetch: (params: ProcessFiltersParams) => Promise<void>
  refetchStatistics: () => void
}

/**
 * Helper: Build orderBy clause based on sort field and direction
 * Extracted to reduce cognitive complexity
 */
type OrderByDirection = 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC' | 'DESC'
type OrderByClause = Record<string, OrderByDirection | Record<string, OrderByDirection>>

const buildOrderByClause = (
  sortField: string | undefined,
  sortOrder: 'ASC' | 'DESC' | '' | undefined
): OrderByClause[] => {
  // Default sort
  if (!sortField || !sortOrder) {
    return [{ createdAt: 'DESC' }]
  }

  const sortDirection: OrderByDirection = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

  // Map sort field to appropriate orderBy structure
  const sortFieldMap: Record<string, OrderByClause[]> = {
    name: [{ name: sortDirection }],
    type: [{ type: { value: sortDirection } }], // type is a CatalogEntry relationship, sort by value field
    typeRef: [{ typeRef: sortDirection }], // typeRef is a simple string field, not a relationship
    startDate: [{ startDate: sortDirection }],
    endDate: [{ endDate: sortDirection }],
    // Status is computed - approximate sorting by endDate then startDate
    status: [{ endDate: sortDirection }, { startDate: sortDirection }],
    createdAt: [{ createdAt: sortDirection }]
  }

  // Return mapped orderBy or fallback to direct field sorting
  return sortFieldMap[sortField] || [{ [sortField]: sortDirection }]
}

export const useSalesCampaignData = (context: BusinessAppContextProps): UseSalesCampaignDataReturn => {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [statistics, setStatistics] = useState<SalesCampaignStatistics | null>(null)
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(true)
  const [statisticsError, setStatisticsError] = useState<string | null>(null)

  const { fetchSalesCampaignsWithCount, fetchSalesCampaignStatistics } = useSalesCampaignQueries({
    accessToken: context.accessToken
  })

  const fetchCampaigns = useCallback(
    async (variables: SalesCampaignQueryVariables = {}) => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Build orderBy clause using helper function
        const orderBy = buildOrderByClause(variables.sortField, variables.sortOrder)

        const queryVariables = {
          ...variables,
          orderBy
        }

        const result = await fetchSalesCampaignsWithCount(queryVariables)

        // Debug: Log first campaign's dates to check format
        if (result.SalesCampaign && result.SalesCampaign.length > 0) {
          console.log('[CampaignData] First campaign dates:', {
            id: result.SalesCampaign[0].id,
            name: result.SalesCampaign[0].name,
            startDate: result.SalesCampaign[0].startDate,
            endDate: result.SalesCampaign[0].endDate,
            createdAt: result.SalesCampaign[0].createdAt,
            startDateType: typeof result.SalesCampaign[0].startDate,
            endDateType: typeof result.SalesCampaign[0].endDate
          })
        }

        setCampaigns(result.SalesCampaign || [])
        setTotalCount(result.SalesCampaignAggregate?.aggregate?.count || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setCampaigns([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, fetchSalesCampaignsWithCount]
  )

  // Process filters and fetch data
  const processFiltersAndFetch = useCallback(
    async (params: ProcessFiltersParams) => {
      const {
        search,
        selectedFilters,
        startDateAfter,
        startDateBefore,
        endDateAfter,
        endDateBefore,
        createdAfter,
        createdBefore,
        sortField,
        sortOrder,
        offset,
        limit
      } = params

      // Extract campaign types from selected filters
      const campaignTypes = selectedFilters
        .filter(filter => filter.startsWith('TYPE_'))
        .map(filter => filter.replace('TYPE_', ''))

      await fetchCampaigns({
        search,
        campaignTypes: campaignTypes.length > 0 ? campaignTypes : undefined,
        startDateAfter,
        startDateBefore,
        endDateAfter,
        endDateBefore,
        createdAfter,
        createdBefore,
        sortField,
        sortOrder,
        offset: offset || 0,
        limit: limit || 20
      })
    },
    [fetchCampaigns]
  )

  const fetchStatistics = useCallback(async () => {
    if (!context.accessToken) {
      setStatisticsError('No access token available')
      setIsStatisticsLoading(false)
      return
    }

    setIsStatisticsLoading(true)
    setStatisticsError(null)

    try {
      const result = await fetchSalesCampaignStatistics()

      // Calculate current average duration
      let averageDuration = 0
      if (result.campaignsWithDuration && result.campaignsWithDuration.length > 0) {
        const totalDays = result.campaignsWithDuration.reduce((total, campaign) => {
          const startDate = new Date(campaign.startDate)
          const endDate = new Date(campaign.endDate)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return total + diffDays
        }, 0)
        averageDuration = Math.round(totalDays / result.campaignsWithDuration.length)
      }

      // Calculate previous period average duration
      let previousAverageDuration = 0
      if (result.previousCampaignsWithDuration && result.previousCampaignsWithDuration.length > 0) {
        const totalDays = result.previousCampaignsWithDuration.reduce((total, campaign) => {
          const startDate = new Date(campaign.startDate)
          const endDate = new Date(campaign.endDate)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return total + diffDays
        }, 0)
        previousAverageDuration = Math.round(totalDays / result.previousCampaignsWithDuration.length)
      }

      setStatistics({
        totalCampaigns: result.totalCampaigns?.aggregate?.count || 0,
        activeCampaigns: result.activeCampaigns?.aggregate?.count || 0,
        completedCampaigns: result.completedCampaigns?.aggregate?.count || 0,
        averageDuration: averageDuration,
        previousPeriod: {
          totalCampaigns: result.previousTotalCampaigns?.aggregate?.count || 0,
          activeCampaigns: result.previousActiveCampaigns?.aggregate?.count || 0,
          completedCampaigns: result.previousCompletedCampaigns?.aggregate?.count || 0,
          averageDuration: previousAverageDuration
        }
      })
    } catch (err) {
      setStatisticsError(err instanceof Error ? err.message : 'Unknown error')
      setStatistics(null)
    } finally {
      setIsStatisticsLoading(false)
    }
  }, [context.accessToken, fetchSalesCampaignStatistics])

  const refetch = useCallback(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const refetchStatistics = useCallback(() => {
    fetchStatistics()
  }, [fetchStatistics])

  useEffect(() => {
    if (context.accessToken) {
      fetchCampaigns()
      fetchStatistics()
    }
  }, [context.accessToken, fetchCampaigns, fetchStatistics])

  return {
    campaigns,
    isLoading,
    error,
    totalCount,
    statistics,
    isStatisticsLoading,
    statisticsError,
    refetch,
    fetchCampaigns,
    processFiltersAndFetch,
    refetchStatistics
  }
}
