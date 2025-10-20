import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import { GET_INVESTMENT_ACCOUNTS_LIST } from '../queries/leadQueries'
import { AccountOption } from '../types'

// Enhanced hook for accounts with infinite scrolling
export const useAccountsList = (accessToken: string) => {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  // Debounce the search term to prevent excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 300)

  const fetchAccounts = useCallback(
    async (searchTerm: string = '', resetOffset: boolean = false) => {
      if (!accessToken) return

      setIsLoading(true)
      try {
        const currentOffset = resetOffset ? 0 : offset
        const variables = {
          limit: 20,
          offset: currentOffset,
          search: searchTerm.trim() || null
        }

        const query = GET_INVESTMENT_ACCOUNTS_LIST(variables)
        const result = await graphqlClient.request<{
          InvestmentAccount: Array<{
            id: string
            name: string
            email?: string
            website?: string
            ownerEmployee?: { displayName: string }
          }>
          InvestmentAccountAggregate: {
            aggregate: { count: number }
          }
        }>(query)

        if (result?.InvestmentAccount && result?.InvestmentAccountAggregate) {
          const newAccounts = result.InvestmentAccount
          const totalCount = result.InvestmentAccountAggregate.aggregate.count

          const accountOptions: AccountOption[] = newAccounts.map(account => ({
            id: account.id,
            value: account.id,
            label: account.name,
            name: account.name,
            email: account.email,
            website: account.website
          }))

          setAccounts(prevAccounts => (resetOffset ? accountOptions : [...prevAccounts, ...accountOptions]))
          setTotal(totalCount)
          setHasMore(newAccounts.length === 20)
          setOffset(currentOffset + newAccounts.length)
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient, offset]
  )

  const searchAccounts = useCallback((searchTerm: string = '') => {
    setSearchTerm(searchTerm)
  }, [])

  // Effect to trigger search when debounced search term changes
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      setCurrentSearch(debouncedSearch)
      setOffset(0)
      fetchAccounts(debouncedSearch, true)
    }
  }, [debouncedSearch, currentSearch, fetchAccounts])

  const loadMoreAccounts = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchAccounts(currentSearch, false)
    }
  }, [isLoading, hasMore, fetchAccounts, currentSearch])

  // Load initial accounts on mount
  useEffect(() => {
    const loadInitialAccounts = async () => {
      if (!accessToken || !graphqlClient || isInitialLoadComplete) return
      await fetchAccounts('', true)
      setIsInitialLoadComplete(true)
    }

    loadInitialAccounts()
  }, [accessToken, graphqlClient])

  return {
    accounts,
    isLoading,
    hasMore,
    total,
    searchAccounts,
    loadMoreAccounts
  }
}
