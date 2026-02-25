import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface AccountItem {
  id: string
  label: string
}

/**
 * Fetches all distinct accounts that are linked to at least one investment.
 * Not scoped to any group or currency — the same list is used across every tab.
 * Executes exactly once after filters are ready (i.e. after the default currency
 * has been initialised) and never re-fetches when the user switches tabs.
 *
 * @param filtersReady - Guard that prevents a premature fetch before initialisation
 */
export const useInvestmentAccountFilter = (accessToken: string, filtersReady = false) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadAccounts = useCallback(async () => {
    if (!accessToken || !filtersReady) return

    setIsLoading(true)
    try {
      const res = await graphqlClient.request<{
        Investment: Array<{
          investmentAccounts: Array<{
            investmentAccountId: string
            investmentAccount?: { id: string; name: string } | null
          }>
        }>
      }>(`
        query GetInvestmentAccounts {
          Investment(
            where: { isDeleted: { _eq: false } }
            limit: 200
          ) {
            investmentAccounts(where: { isDeleted: { _eq: false } }) {
              investmentAccountId
              investmentAccount { id name }
            }
          }
        }
      `)

      const map = new Map<string, string>()
      ;(res?.Investment || []).forEach(inv => {
        inv.investmentAccounts?.forEach(assoc => {
          const a = assoc.investmentAccount
          if (a?.id && a?.name) map.set(a.id, a.name)
        })
      })

      setAccounts(Array.from(map.entries()).map(([id, label]) => ({ id, label })))
    } catch {
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, filtersReady, graphqlClient])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  return { accounts, isLoading }
}
