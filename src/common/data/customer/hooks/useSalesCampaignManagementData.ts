import { useState, useEffect, useCallback, useRef } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesCampaignManagementQueries } from './useSalesCampaignManagementQueries'
import type {
  SalesCampaignQueryVariables,
  SalesCampaign,
  SalesCampaignStatistics
} from '../types/salesCampaignManagementTypes'

export interface ProcessFiltersParams {
  search: string
  searchColumns?: string[]
  selectedFilters: string[]
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC' | ''
  campaignStatuses?: string[]
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
  fetchSalesCampaignsWithCount: (variables?: SalesCampaignQueryVariables) => Promise<any>
  processFiltersAndFetch: (params: ProcessFiltersParams) => Promise<void>
  refetchStatistics: () => void
}

type OrderByDirection = 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC' | 'DESC'
type OrderByClause = Record<string, OrderByDirection | Record<string, OrderByDirection>>

const buildOrderByClause = (
  sortField: string | undefined,
  sortOrder: 'ASC' | 'DESC' | '' | undefined
): OrderByClause[] => {
  if (!sortField || !sortOrder) {
    return [{ createdAt: 'DESC' }]
  }

  const sortDirection: OrderByDirection = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
  const sortFieldMap: Record<string, OrderByClause[]> = {
    name: [{ name: sortDirection }],
    type: [{ type: { value: sortDirection } }],
    typeRef: [{ typeRef: sortDirection }],
    startDate: [{ startDate: sortDirection }],
    endDate: [{ endDate: sortDirection }],
    status: [{ customerCampaignStatus: { value: sortDirection } }],
    createdAt: [{ createdAt: sortDirection }]
  }

  return sortFieldMap[sortField] || [{ [sortField]: sortDirection }]
}

export const useSalesCampaignManagementData = (context: BusinessAppContextProps): UseSalesCampaignDataReturn => {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [statistics, setStatistics] = useState<SalesCampaignStatistics | null>(null)
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(true)
  const [statisticsError, setStatisticsError] = useState<string | null>(null)
  const lastCampaignQueryVariablesRef = useRef<SalesCampaignQueryVariables>({})
  const latestCampaignRequestIdRef = useRef(0)

  const { fetchSalesCampaignsWithCount, fetchSalesCampaignStatistics } = useSalesCampaignManagementQueries({
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

      const requestId = latestCampaignRequestIdRef.current + 1
      latestCampaignRequestIdRef.current = requestId
      const isStale = () => requestId !== latestCampaignRequestIdRef.current

      try {
        const orderBy = buildOrderByClause(variables.sortField, variables.sortOrder)
        const queryVariables = {
          ...variables,
          orderBy
        }
        lastCampaignQueryVariablesRef.current = variables

        const result = await fetchSalesCampaignsWithCount(queryVariables)
        if (isStale()) return
        setCampaigns(result.SalesCampaign || [])
        setTotalCount(result.SalesCampaignAggregate?.aggregate?.count || 0)
      } catch (err) {
        if (isStale()) return
        setError(err instanceof Error ? err.message : 'Unknown error')
        setCampaigns([])
        setTotalCount(0)
      } finally {
        if (!isStale()) {
          setIsLoading(false)
        }
      }
    },
    [context.accessToken, fetchSalesCampaignsWithCount]
  )

  const processFiltersAndFetch = useCallback(
    async (params: ProcessFiltersParams) => {
      const {
        search,
        searchColumns,
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

      const campaignTypes = selectedFilters
        .filter(filter => filter.startsWith('TYPE_'))
        .map(filter => filter.replace('TYPE_', ''))
      const campaignStatuses = selectedFilters
        .filter(filter => filter.startsWith('STATUS_'))
        .map(filter => filter.replace('STATUS_', ''))

      await fetchCampaigns({
        search,
        searchColumns,
        campaignTypes: campaignTypes.length > 0 ? campaignTypes : undefined,
        campaignStatuses: campaignStatuses.length > 0 ? campaignStatuses : undefined,
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
        averageDuration,
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
    fetchCampaigns(lastCampaignQueryVariablesRef.current)
  }, [fetchCampaigns])

  const refetchStatistics = useCallback(() => {
    fetchStatistics()
  }, [fetchStatistics])

  useEffect(() => {
    if (context.accessToken) {
      fetchStatistics()
    }
  }, [context.accessToken, fetchStatistics])

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
    fetchSalesCampaignsWithCount,
    processFiltersAndFetch,
    refetchStatistics
  }
}
