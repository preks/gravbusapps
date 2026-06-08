import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toCustomerAccount, type CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import {
  buildCustomerAccountQuery,
  buildCustomerAccountWhereCondition,
  buildCustomerAccountOrderBy,
  type CustomerAccountQueryVariables
} from '@/common/data/customer/queries/customerAccountQueries'
import type { CustomerAccountListQueryResponse } from '@/common/data/customer/hooks/useCustomerAccounts'

export interface UseAccountSelectorOptionsResult {
  accounts: CustomerAccount[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
}

/**
 * Shared paginated/searchable account selector source for "add account"-style comboboxes.
 *
 * Fetches customer accounts while excluding `excludeAccountIds` server-side (`id: { _nin: [...] }`)
 * so search/pagination stay correct without polluting the shared CRM account query. Callers resolve
 * the exclusion list however they need (e.g. accounts already linked to a campaign or an event) and
 * pass it in via `excludeAccountIds`/`excludeLoading`.
 */
export function useAccountSelectorOptions(
  context: BusinessAppContextProps,
  excludeAccountIds: string[],
  excludeLoading: boolean,
  pageSize = 20
): UseAccountSelectorOptionsResult {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const excludeKey = excludeAccountIds.join(',')

  const [state, setState] = useState({
    accounts: [] as CustomerAccount[],
    loading: true,
    error: null as string | null,
    hasMore: false
  })

  const isFetchingRef = useRef(false)
  const currentSearchRef = useRef('')
  const currentOffsetRef = useRef(0)

  const fetchPage = useCallback(
    async (searchTerm: string, offset: number, append: boolean) => {
      if (isFetchingRef.current) return
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      isFetchingRef.current = true
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars: CustomerAccountQueryVariables = { limit: pageSize, offset }
        if (searchTerm.trim()) {
          vars.search = searchTerm.trim()
        }

        const baseWhere = buildCustomerAccountWhereCondition(vars)
        const excludeIds = excludeKey ? excludeKey.split(',') : []
        const where = excludeIds.length > 0 ? { _and: [baseWhere, { id: { _nin: excludeIds } }] } : baseWhere

        const query = buildCustomerAccountQuery()
        const orderBy = buildCustomerAccountOrderBy(vars.orderBy || [])

        const result = await graphqlClient.request<CustomerAccountListQueryResponse>(query, {
          limit: pageSize,
          offset,
          where,
          orderBy
        })

        const newAccounts = result.Account.map(toCustomerAccount)
        currentOffsetRef.current = offset + newAccounts.length

        setState(prev => ({
          accounts: append ? [...prev.accounts, ...newAccounts] : newAccounts,
          loading: false,
          error: null,
          hasMore: newAccounts.length === pageSize
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch accounts'
        }))
      } finally {
        isFetchingRef.current = false
      }
    },
    [context.accessToken, graphqlClient, pageSize, excludeKey]
  )

  useEffect(() => {
    if (excludeLoading) return
    currentSearchRef.current = ''
    currentOffsetRef.current = 0
    fetchPage('', 0, false)
  }, [fetchPage, excludeLoading])

  const search = useCallback(
    (searchTerm: string) => {
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !isFetchingRef.current) {
      fetchPage(currentSearchRef.current, currentOffsetRef.current, true)
    }
  }, [fetchPage, state.hasMore])

  return { ...state, search, loadMore }
}
