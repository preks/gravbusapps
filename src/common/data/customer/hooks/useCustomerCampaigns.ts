import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

/**
 * SalesCampaign interface
 */
export interface SalesCampaign {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  type?: {
    id: string
    value: string
    code: string
    translations?: Array<{
      localeCode: string
      value?: string
    }>
  }
  typeRef?: string
}

/**
 * SelectOption interface for backward compatibility
 */
export interface SalesCampaignOption {
  id: string
  value: string
  label: string
  name: string
  type?: SalesCampaign['type']
  typeRef?: string
  extraInfo?: {
    description?: string
    startDate?: string
    endDate?: string
  }
}

interface SalesCampaignResponse {
  SalesCampaign: SalesCampaign[]
  SalesCampaignAggregate: {
    aggregate: {
      count: number
    }
  }
}

interface SalesCampaignsState {
  campaigns: SalesCampaign[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalCount: number
  currentSearch: string
  offset: number
}

/**
 * GraphQL query for active sales campaigns
 */
const buildSalesCampaignsQuery = (hasSearch: boolean): string => {
  const searchCondition = hasSearch ? '{ name: { _ilike: $searchTerm } }' : ''
  const searchConditions = hasSearch ? `,${searchCondition}` : ''

  return `
    query GetActiveSalesCampaigns($currentDate: timestamp!, $limit: Int, $offset: Int${hasSearch ? ', $searchTerm: String' : ''}) {
      SalesCampaign(
        distinctOn: [name]
        limit: $limit
        offset: $offset
        where: {
          _and: [
            { startDate: { _lte: $currentDate } },
            { endDate: { _gte: $currentDate } },
            { isDeleted: { _eq: false } }${searchConditions}
          ]
        }
        orderBy: [{ name: ASC }]
      ) {
        id
        name
        description
        startDate
        endDate
        type {
          id
          value
          code
          translations {
            localeCode
            value
          }
        }
        typeRef
      }
      SalesCampaignAggregate(
        where: {
          _and: [
            { startDate: { _lte: $currentDate } },
            { endDate: { _gte: $currentDate } },
            { isDeleted: { _eq: false } }${searchConditions}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Hook for fetching sales campaigns with search, pagination, and filtering
 * @param accessToken - User access token
 * @param pageSize - Number of items per page (default: 20)
 * @param autoFetch - Whether to auto-fetch on mount (default: false for performance)
 */
export const useCustomerCampaigns = (accessToken: string, pageSize: number = 20, autoFetch: boolean = false) => {
  const [state, setState] = useState<SalesCampaignsState>({
    campaigns: [],
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    currentSearch: '',
    offset: 0
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const isFetchingRef = useRef(false)
  const currentSearchRef = useRef('')
  const currentOffsetRef = useRef(0)

  // Transform campaigns to options format (backward compatibility)
  const options: SalesCampaignOption[] = useMemo(
    () =>
      state.campaigns.map(campaign => ({
        id: campaign.id,
        value: campaign.id,
        label: campaign.name,
        name: campaign.name,
        type: campaign.type,
        typeRef: campaign.typeRef,
        extraInfo: {
          description: campaign.description,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        }
      })),
    [state.campaigns]
  )

  const fetchSalesCampaigns = useCallback(
    async (searchTerm: string = '', offset: number = 0, append: boolean = false) => {
      // Synchronous guard — prevents the Combobox intersection observer from triggering
      // concurrent fetches with the same offset before React state updates propagate.
      if (isFetchingRef.current) return
      if (!accessToken) {
        setState(prev => ({ ...prev, error: 'No access token provided' }))
        return
      }

      isFetchingRef.current = true
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const hasSearch = searchTerm.trim().length > 0
        const query = buildSalesCampaignsQuery(hasSearch)

        const variables: any = {
          currentDate: new Date().toISOString().replace('Z', ''),
          limit: pageSize,
          offset
        }

        if (hasSearch) {
          variables.searchTerm = `%${searchTerm.trim()}%`
        }

        const result = await graphqlClient.request<SalesCampaignResponse>(query, variables)

        if (result?.SalesCampaign) {
          const newCampaigns = result.SalesCampaign || []
          const totalCount = result.SalesCampaignAggregate?.aggregate?.count || 0
          const newOffset = offset + newCampaigns.length

          const hasMore = newCampaigns.length === pageSize

          currentOffsetRef.current = newOffset

          setState(prev => ({
            campaigns: append ? [...prev.campaigns, ...newCampaigns] : newCampaigns,
            loading: false,
            error: null,
            hasMore,
            totalCount,
            currentSearch: searchTerm,
            offset: newOffset
          }))
        } else {
          console.warn('No sales campaigns data in response:', result)
          currentOffsetRef.current = append ? currentOffsetRef.current : 0
          setState(prev => ({
            ...prev,
            campaigns: append ? prev.campaigns : [],
            loading: false,
            hasMore: false,
            totalCount: 0,
            currentSearch: searchTerm,
            offset: append ? prev.offset : 0
          }))
        }
      } catch (error) {
        console.error('Error fetching sales campaigns:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch sales campaigns'
        }))
      } finally {
        isFetchingRef.current = false
      }
    },
    [accessToken, graphqlClient, pageSize]
  )

  const search = useCallback(
    (searchTerm: string = '') => {
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      fetchSalesCampaigns(searchTerm, 0, false)
    },
    [fetchSalesCampaigns]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !isFetchingRef.current) {
      fetchSalesCampaigns(currentSearchRef.current, currentOffsetRef.current, true)
    }
  }, [fetchSalesCampaigns, state.hasMore])

  const initialize = useCallback(() => {
    currentSearchRef.current = ''
    currentOffsetRef.current = 0
    fetchSalesCampaigns('', 0, false)
  }, [fetchSalesCampaigns])

  const refetch = useCallback(() => {
    currentOffsetRef.current = 0
    fetchSalesCampaigns(currentSearchRef.current, 0, false)
  }, [fetchSalesCampaigns])

  // Auto-initialize on mount (only if autoFetch is true)
  useEffect(() => {
    if (accessToken && autoFetch) {
      initialize()
    }
  }, [accessToken, autoFetch, initialize])

  return {
    // Options format (backward compatibility)
    options,
    // Raw campaigns data
    campaigns: state.campaigns,
    // State
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    totalCount: state.totalCount,
    // Actions
    search,
    loadMore,
    initialize,
    refetch
  }
}
