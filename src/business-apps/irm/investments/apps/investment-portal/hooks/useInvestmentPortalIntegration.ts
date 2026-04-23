import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'

interface UseInvestmentPortalIntegrationOptions {
  /** Live, raw search input (debounced internally before hitting the backend). */
  searchQuery?: string
}

const SEARCH_DEBOUNCE_MS = 300

export const useInvestmentPortalIntegration = (
  context: BusinessAppContextProps,
  options: UseInvestmentPortalIntegrationOptions = {}
) => {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [totalInvestmentsCount, setTotalInvestmentsCount] = useState(0)
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [contacts, setContacts] = useState<InvestmentContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestments } = useGetInvestments(context)
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)

  // IMPORTANT: depend on the PRIMITIVE userId, not the userInfo object reference.
  // Parents recreate the `context` object on every render (e.g. on tab change,
  // expand/collapse), and even when `userInfo` itself is stable upstream, taking
  // a dep on the object can churn `loadInitial` and re-fire the effect below,
  // causing the entire portal to reload (`setIsLoading(true)`) on every click.
  const userId = context.userInfo?.id

  // Debounce the live search input so we don't hit the backend on every keystroke.
  // Mirrors the behavior of the InvestmentView server-side search.
  const liveSearch = options.searchQuery ?? ''
  const [debouncedSearch, setDebouncedSearch] = useState(liveSearch.trim())
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(liveSearch.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [liveSearch])

  // ---------------------------------------------------------------------------
  // Initial load: contacts -> derive accountIds -> investments (no search yet)
  // ---------------------------------------------------------------------------
  const loadInitial = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!userId) {
        setError('No user ID found')
        return
      }

      // Step 1: Find every contact row linked to this user
      const contactsResult = await fetchInvestmentContacts({ userIds: [userId] })
      const contactsData = contactsResult.InvestmentContact || []

      if (contactsData.length === 0) {
        setError('No contact found for this user')
        setContacts([])
        setAccountIds([])
        setInvestments([])
        setTotalInvestmentsCount(0)
        return
      }

      // Step 2: Aggregate account IDs across ALL contacts (a single user can
      // be linked to multiple InvestmentContact rows, one per role).
      const accountIdSet = new Set<string>()
      for (const contact of contactsData) {
        if (!Array.isArray(contact.accountContacts)) continue
        for (const iac of contact.accountContacts) {
          if (iac.account?.id) {
            accountIdSet.add(iac.account.id)
          }
        }
      }
      const ids = Array.from(accountIdSet)

      setContacts(contactsData)
      setAccountIds(ids)

      if (ids.length === 0) {
        setInvestments([])
        setTotalInvestmentsCount(0)
        setAccounts([])
        return
      }

      // Step 3: Load investments for those accounts (no search on first load)
      const investmentsResult = await fetchInvestments({ accountIds: ids })
      const list = investmentsResult?.Investment || []

      setInvestments(list)
      setTotalInvestmentsCount(list.length)
      setAccounts([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading investment portal data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchInvestments, fetchInvestmentContacts, userId])

  useEffect(() => {
    if (context.accessToken) {
      loadInitial()
    }
  }, [context.accessToken, loadInitial])

  // ---------------------------------------------------------------------------
  // Server-side search: re-fetch ONLY the investments list (with the cached
  // accountIds) whenever the debounced search value changes. We never refetch
  // contacts here.
  //
  // `lastSearchedRef` guards against the duplicate fetch that would otherwise
  // happen the moment the initial load finishes (this effect re-runs because
  // `accountIds` and `isLoading` flip, even though the search value hasn't
  // actually changed).
  // ---------------------------------------------------------------------------
  const lastSearchedRef = useRef<string>('')
  useEffect(() => {
    if (isLoading) return
    if (accountIds.length === 0) return
    if (lastSearchedRef.current === debouncedSearch) return
    lastSearchedRef.current = debouncedSearch

    let cancelled = false
    const run = async () => {
      setIsSearching(true)
      try {
        const res = await fetchInvestments({
          accountIds,
          search: debouncedSearch || undefined
        })
        if (!cancelled) {
          setInvestments(res?.Investment || [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error searching investments:', err)
          setError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, accountIds, isLoading, fetchInvestments])

  // Get investments associated with current user context via account/contact
  // Note: Investments are already filtered server-side in loadInitial() and
  // refined server-side by the search effect above.
  const getUserAssociatedInvestments = useCallback(() => investments, [investments])

  return {
    // Data
    investments,
    accounts,
    contacts,
    /**
     * Count of investments returned by the initial (un-searched) load. Use this
     * for UI decisions that should NOT be affected by an in-progress search,
     * e.g. showing/hiding the search bar or the "X investments" header count.
     */
    totalInvestmentsCount,

    // State
    isLoading,
    /** True while a server-side search refetch is in flight. */
    isSearching,
    error,

    // Actions
    refetch: loadInitial,

    // Utility functions
    getUserAssociatedInvestments
  }
}
