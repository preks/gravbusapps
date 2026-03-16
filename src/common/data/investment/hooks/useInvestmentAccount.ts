// Investment Account hook - single account by ID with automatic state management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toInvestmentAccount, type InvestmentAccount } from '../types/investmentAccountTypes'
import { buildInvestmentAccountByIdQuery } from '../queries/investmentAccountQueries'

export interface AdditionalQuery<TResult = any> {
  query: string
  variables?: Record<string, any>
  data: (result: any) => TResult
  key: string
}

export interface UseInvestmentAccountOptions {
  additionalQueries?: AdditionalQuery[]
}

export interface UseInvestmentAccountResult {
  account: InvestmentAccount | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  [key: string]: any
}

/**
 * Declarative hook for fetching a single investment account by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * Supports `additionalQueries` to combine extra GraphQL selections into the same
 * network request — avoiding redundant round-trips (e.g. fetching linked investments
 * alongside the account in one query).
 *
 * @param accessToken - Access token for authentication
 * @param id - Account ID to fetch
 * @param options - Optional configuration including additionalQueries
 */
export function useInvestmentAccount(
  accessToken: string,
  id: string | undefined,
  options?: UseInvestmentAccountOptions
): UseInvestmentAccountResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const additionalQueries = useMemo(() => options?.additionalQueries || [], [options?.additionalQueries])

  const [state, setState] = useState<Omit<UseInvestmentAccountResult, 'refetch'>>({
    account: null,
    loading: true,
    error: null,
    ...Object.fromEntries(additionalQueries.map(aq => [aq.key, undefined]))
  })

  const fetchAccount = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let combinedQuery = buildInvestmentAccountByIdQuery()

      if (additionalQueries.length > 0) {
        const additionalQueryBodies = additionalQueries.map(aq => aq.query).join('\n')
        const lastBraceIndex = combinedQuery.lastIndexOf('}')
        if (lastBraceIndex !== -1) {
          combinedQuery = combinedQuery.slice(0, lastBraceIndex) + `\n${additionalQueryBodies}\n}`
        }
      }

      const result = await graphqlClient.request<{ InvestmentAccountByPk: any } & Record<string, any>>(combinedQuery, {
        id
      })

      const raw = result.InvestmentAccountByPk
      const account = raw ? toInvestmentAccount(raw) : null

      const additionalData = Object.fromEntries(additionalQueries.map(aq => [aq.key, aq.data(result)]))

      setState({ account, loading: false, error: null, ...additionalData })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment account'
      console.error('Error fetching investment account:', error)
      setState({
        account: null,
        loading: false,
        error: errorMessage,
        ...Object.fromEntries(additionalQueries.map(aq => [aq.key, undefined]))
      })
    }
  }, [id, accessToken, graphqlClient, additionalQueries])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  return {
    ...state,
    refetch: fetchAccount
  }
}
