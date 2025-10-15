import { useState, useCallback, useEffect } from 'react'
import { SelectOption } from '../../core/forms/account-form/types'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface SalesCampaignsState {
  options: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  currentSearch: string
  offset: number
}

export const useSalesCampaignsGraphQL = (accessToken: string, pageSize: number = 20) => {
  const [state, setState] = useState<SalesCampaignsState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchSalesCampaigns = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!accessToken) {
        return
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { options: [] })
      }))

      try {
        // Simple sales campaign query - you may need to adjust the schema
        const query = search.trim()
          ? `
            query GetSalesCampaigns($limit: Int, $offset: Int, $search: String) {
              SalesCampaign(
                where: {
                  name: { _ilike: $search }
                  isDeleted: { _eq: false }
                }
                limit: $limit
                offset: $offset
                orderBy: [{ name: ASC }]
              ) {
                id
                name
                description
                startDate
                endDate
              }
            }
          `
          : `
            query GetSalesCampaigns($limit: Int, $offset: Int) {
              SalesCampaign(
                where: {
                  isDeleted: { _eq: false }
                }
                limit: $limit
                offset: $offset
                orderBy: [{ name: ASC }]
              ) {
                id
                name
                description
                startDate
                endDate
              }
            }
          `

        const variables: any = {
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = `%${search.trim()}%`
        }

        const response = await graphqlClient.request(query, variables)

        const mappedOptions: SelectOption[] = (response.SalesCampaign || []).map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name || 'Unknown Campaign',
          label: campaign.name || 'Unknown Campaign',
          value: campaign.id,
          extraInfo: {
            description: campaign.description,
            startDate: campaign.startDate,
            endDate: campaign.endDate
          }
        }))

        const hasMoreRecords = mappedOptions.length === pageSize

        setState(prev => ({
          ...prev,
          options: append ? [...prev.options, ...mappedOptions] : mappedOptions,
          loading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append ? prev.offset + mappedOptions.length : mappedOptions.length
        }))
      } catch (error) {
        console.error('❌ Error fetching sales campaigns:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch sales campaigns'
        }))
      }
    },
    [accessToken, graphqlClient, pageSize]
  )

  const search = useCallback(
    (searchTerm: string) => {
      fetchSalesCampaigns(searchTerm, 0, false)
    },
    [fetchSalesCampaigns]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchSalesCampaigns(state.currentSearch, state.offset, true)
    }
  }, [fetchSalesCampaigns, state.hasMore, state.loading, state.currentSearch, state.offset])

  const initialize = useCallback(() => {
    fetchSalesCampaigns('', 0, false)
  }, [fetchSalesCampaigns])

  useEffect(() => {
    if (accessToken) {
      console.log('📢 Sales Campaigns GraphQL hook initializing...')
      initialize()
    }
  }, [accessToken, initialize])

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    search,
    loadMore,
    initialize
  }
}
