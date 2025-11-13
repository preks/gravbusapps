import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesCampaignQueries } from './useSalesCampaignQueries'
import { SalesCampaignQueryVariables, SalesCampaign, SalesCampaignStatistics } from '../types/SalesCampaignTypes'

export interface UseSalesCampaignDataReturn {
  campaigns: SalesCampaign[]
  isLoading: boolean
  error: string | null
  totalCount: number
  statistics: SalesCampaignStatistics | null
  statisticsLoading: boolean
  statisticsError: string | null
  refetch: () => void
  fetchCampaigns: (variables?: SalesCampaignQueryVariables) => Promise<void>
  processFiltersAndFetch: (
    search: string,
    selectedFilters: string[],
    startDateAfter?: string,
    startDateBefore?: string,
    endDateAfter?: string,
    endDateBefore?: string,
    createdAfter?: string,
    createdBefore?: string,
    sortField?: string,
    sortOrder?: 'ASC' | 'DESC' | '',
    offset?: number,
    limit?: number
  ) => Promise<void>
  refetchStatistics: () => void
}

export const useSalesCampaignData = (context: BusinessAppContextProps): UseSalesCampaignDataReturn => {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [statistics, setStatistics] = useState<SalesCampaignStatistics | null>(null)
  const [statisticsLoading, setIsStatisticsLoading] = useState(true)
  const [statisticsError, setStatisticsError] = useState<string | null>(null)

  const { fetchSalesCampaignsWithCount, fetchSalesCampaignStatistics } = useSalesCampaignQueries({
    accessToken: context.accessToken
  })

  const fetchCampaigns = useCallback(
    async (variables: SalesCampaignQueryVariables = {}, showLoading: boolean = true) => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsLoading(false)
        return
      }

      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      try {
        // Build orderBy clause for sorting
        let orderBy: any[] = [{ createdAt: 'DESC' }] // Default sort

        if (variables.sortField && variables.sortOrder) {
          const sortDirection = variables.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

          if (variables.sortField === 'name') {
            orderBy = [{ name: sortDirection }]
          } else if (variables.sortField === 'typeRef') {
            orderBy = [{ type: { value: sortDirection } }]
          } else if (variables.sortField === 'startDate') {
            orderBy = [{ startDate: sortDirection }]
          } else if (variables.sortField === 'endDate') {
            orderBy = [{ endDate: sortDirection }]
          } else if (variables.sortField === 'status') {
            // Status is computed (Planned/Active/Completed). Approximate sorting by endDate descending for 'Active' vs 'Completed',
            // and then by startDate for 'Planned'. This uses a deterministic order without custom DB functions.
            // We simulate by primary endDate then startDate which groups statuses reasonably.
            orderBy = [{ endDate: sortDirection }, { startDate: sortDirection }]
          } else if (variables.sortField === 'createdAt') {
            orderBy = [{ createdAt: sortDirection }]
          } else {
            // Fallback: try to sort by the field directly
            orderBy = [{ [variables.sortField]: sortDirection }]
          }
        }

        const queryVariables = {
          ...variables,
          orderBy
        }

        const result = await fetchSalesCampaignsWithCount(queryVariables)
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
    async (
      search: string,
      selectedFilters: string[],
      startDateAfter?: string,
      startDateBefore?: string,
      endDateAfter?: string,
      endDateBefore?: string,
      createdAfter?: string,
      createdBefore?: string,
      sortField?: string,
      sortOrder?: 'ASC' | 'DESC' | '',
      offset?: number,
      limit?: number
    ) => {
      // Extract campaign types from selected filters
      const campaignTypes = selectedFilters
        .filter(filter => filter.startsWith('TYPE_'))
        .map(filter => filter.replace('TYPE_', ''))

      await fetchCampaigns(
        {
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
        },
        false
      ) // Don't show loading for filtering/sorting operations
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

      // Helper to calculate trend
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) {
          return { changePercent: current > 0 ? 100 : 0, isPositive: current > 0 }
        }
        const changePercent = ((current - previous) / previous) * 100
        return { changePercent, isPositive: changePercent >= 0 }
      }

      // Helper to calculate average duration from campaigns
      const calculateAverageDuration = (campaigns: Array<{ startDate: string; endDate: string }>): number => {
        if (!campaigns || campaigns.length === 0) return 0
        const totalDays = campaigns.reduce((total, campaign) => {
          const startDate = new Date(campaign.startDate)
          const endDate = new Date(campaign.endDate)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return total + diffDays
        }, 0)
        return Math.round(totalDays / campaigns.length)
      }

      // Calculate average duration for current and previous year
      const averageDurationCurrent = calculateAverageDuration(result.campaignsWithDuration)
      const averageDurationPrevious = calculateAverageDuration(result.campaignsWithDurationPrevious)

      // Extract counts
      const totalCurrent = result.totalCampaigns?.aggregate?.count || 0
      const totalPrevious = result.totalCampaignsPrevious?.aggregate?.count || 0
      const activeCurrent = result.activeCampaigns?.aggregate?.count || 0
      const activePrevious = result.activeCampaignsPrevious?.aggregate?.count || 0
      const completedCurrent = result.completedCampaigns?.aggregate?.count || 0
      const completedPrevious = result.completedCampaignsPrevious?.aggregate?.count || 0

      setStatistics({
        totalCampaigns: {
          current: totalCurrent,
          ...calculateTrend(totalCurrent, totalPrevious)
        },
        activeCampaigns: {
          current: activeCurrent,
          ...calculateTrend(activeCurrent, activePrevious)
        },
        completedCampaigns: {
          current: completedCurrent,
          ...calculateTrend(completedCurrent, completedPrevious)
        },
        averageDuration: {
          current: averageDurationCurrent,
          ...calculateTrend(averageDurationCurrent, averageDurationPrevious)
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
    statisticsLoading,
    statisticsError,
    refetch,
    fetchCampaigns,
    processFiltersAndFetch,
    refetchStatistics
  }
}
