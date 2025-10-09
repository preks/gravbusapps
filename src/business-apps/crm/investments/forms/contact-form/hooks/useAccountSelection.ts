import { useState, useCallback, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetInvestmentAccounts,
  useSearchInvestmentAccounts
} from '@/common/data/investment/hooks/useInvestmentAccounts'
import { SelectOption } from '../types'
import type { InvestmentAccount } from '@/common/data/investment/types'

export interface UseAccountSelectionReturn {
  accounts: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  clearSearch: () => void
}

export const useAccountSelection = (context: BusinessAppContextProps): UseAccountSelectionReturn => {
  const [accounts, setAccounts] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentSearch, setCurrentSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [totalFetched, setTotalFetched] = useState(0)

  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const { searchInvestmentAccounts } = useSearchInvestmentAccounts(context)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSearchRef = useRef<string>('')
  const LIMIT = 20

  const fetchAccounts = useCallback(
    async (searchTerm: string = '', newOffset: number = 0, append: boolean = false) => {
      if (!context.accessToken) return

      try {
        setLoading(true)
        setError(null)

        const variables = {
          limit: LIMIT,
          offset: newOffset,
          ...(searchTerm.trim() && { search: searchTerm.trim() })
        }

        const result = searchTerm.trim()
          ? await searchInvestmentAccounts(searchTerm.trim(), variables)
          : await fetchInvestmentAccounts(variables)

        const newAccounts = result.InvestmentAccount.map((account: InvestmentAccount) => ({
          id: account.id,
          value: account.id,
          label: account.name,
          name: account.name,
          extraInfo: {
            website: account.website,
            email: account.email,
            phone: account.phone,
            industry: account.industryClass?.value,
            legalForm: account.legalForm?.value,
            owner: account.ownerEmployee?.displayName
          }
        }))

        if (append) {
          setAccounts(prev => [...prev, ...newAccounts])
        } else {
          setAccounts(newAccounts)
        }

        setTotalFetched(prev => prev + newAccounts.length)
        setHasMore(newAccounts.length === LIMIT)
        setOffset(newOffset + newAccounts.length)
      } catch (err) {
        console.error('Error fetching investment accounts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
        setAccounts([])
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, fetchInvestmentAccounts, searchInvestmentAccounts]
  )

  // Load initial accounts on mount
  useEffect(() => {
    fetchAccounts('', 0, false)
  }, [fetchAccounts])

  const search = useCallback(
    (searchTerm: string) => {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        if (searchTerm !== lastSearchRef.current) {
          setCurrentSearch(searchTerm)
          setOffset(0)
          setTotalFetched(0)
          setHasMore(true)
          lastSearchRef.current = searchTerm
          fetchAccounts(searchTerm, 0, false)
        }
      }, 300)
    },
    [fetchAccounts]
  )

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchAccounts(currentSearch, offset, true)
    }
  }, [loading, hasMore, currentSearch, offset, fetchAccounts])

  const clearSearch = useCallback(() => {
    setCurrentSearch('')
    setOffset(0)
    setTotalFetched(0)
    setHasMore(true)
    lastSearchRef.current = ''
    fetchAccounts('', 0, false)
  }, [fetchAccounts])

  return {
    accounts,
    loading,
    error,
    hasMore,
    search,
    loadMore,
    clearSearch
  }
}
