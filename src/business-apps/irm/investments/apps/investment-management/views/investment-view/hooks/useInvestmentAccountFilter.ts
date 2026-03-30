import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface AccountItem {
  id: string
  label: string
}

/**
 * Fetches only accounts that are linked to at least one investment,
 * for use in the "Investment Account" filter dropdown.
 *
 * Uses the junction table (InvestmentInvestmentAccount) so accounts without
 * any linked investment are excluded. Results are sorted by name in the DB;
 * a Set removes duplicates (same account linked to multiple investments)
 * while preserving that order.
 *
 * Not scoped to any group or currency — shared across every tab.
 * Executes exactly once after filters are ready and never re-fetches on tab switch.
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
        InvestmentInvestmentAccount: Array<{
          investmentAccount: { id: string; name: string } | null
        }>
      }>(`
        query GetInvestmentAccounts {
          InvestmentInvestmentAccount(
            where: { isDeleted: { _eq: false } }
            orderBy: [{ investmentAccount: { name: ASC } }]
            limit: 200
          ) {
            investmentAccount { id name }
          }
        }
      `)

      const seen = new Set<string>()
      const items: AccountItem[] = []
      for (const row of res?.InvestmentInvestmentAccount || []) {
        const a = row.investmentAccount
        if (!a?.id || !a?.name || seen.has(a.id)) continue
        seen.add(a.id)
        items.push({ id: a.id, label: a.name })
      }

      setAccounts(items)
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
