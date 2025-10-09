import { useState, useCallback, useEffect } from 'react'
import { SelectOption } from '../types'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface AccountsHookParams {
  accessToken: string
  pageSize?: number
}

interface AccountsState {
  options: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  currentSearch: string
  offset: number
}

export const useAccountsGraphQL = ({ accessToken, pageSize = 20 }: AccountsHookParams) => {
  const [state, setState] = useState<AccountsState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const buildInvestmentAccountsQuery = (search: string = '', offset: number = 0, limit: number = 20) =>
    search.trim()
      ? `
        query GetInvestmentAccounts($limit: Int, $offset: Int, $search: String) {
          InvestmentAccount(
            where: {
              _and: [
                { isDeleted: { _eq: false } },
                { name: { _ilike: $search } }
              ]
            }
            limit: $limit
            offset: $offset
            orderBy: [{ name: ASC }]
            distinctOn: [name]
          ) {
            id
            name
            businessKey
            code
            website
            email
            phone
            ownerEmployee {
              firstName
              lastName
            }
          }
        }
      `
      : `
        query GetInvestmentAccounts($limit: Int, $offset: Int) {
          InvestmentAccount(
            where: {
              isDeleted: { _eq: false }
            }
            limit: $limit
            offset: $offset
            orderBy: [{ name: ASC }]
            distinctOn: [name]
          ) {
            id
            name
            businessKey
            code
            website
            email
            phone
            ownerEmployee {
              firstName
              lastName
            }
          }
        }
      `

  const fetchAccounts = useCallback(
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
        const query = buildInvestmentAccountsQuery(search, offset, pageSize)

        const variables: any = {
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = `%${search.trim()}%`
        }

        const response = await graphqlClient.request(query, variables)

        const mappedOptions: SelectOption[] = response.InvestmentAccount.map((entry: any) => ({
          id: String(entry.id),
          name: entry.name || 'Unknown',
          label: entry.name || 'Unknown',
          value: String(entry.id),
          extraInfo: {
            businessKey: entry.businessKey,
            code: entry.code,
            website: entry.website,
            email: entry.email,
            phone: entry.phone,
            ownerEmployee: entry.ownerEmployee
          }
        }))

        // Since GraphQL doesn't return total count in this query, we assume there's more if we get a full page
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
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch accounts'
        }))
      }
    },
    [accessToken, graphqlClient, pageSize]
  )

  const search = useCallback(
    (searchTerm: string) => {
      fetchAccounts(searchTerm, 0, false)
    },
    [fetchAccounts]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchAccounts(state.currentSearch, state.offset, true)
    }
  }, [fetchAccounts, state.hasMore, state.loading, state.currentSearch, state.offset])

  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: '',
      offset: 0
    })
  }, [])

  const initialize = useCallback(() => {
    fetchAccounts('', 0, false)
  }, [fetchAccounts])

  useEffect(() => {
    if (accessToken) {
      initialize()
    } else {
    }
  }, [accessToken, initialize])

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    search,
    loadMore,
    reset,
    initialize
  }
}
