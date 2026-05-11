import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildInvestmentCompanyGroupByIdQuery } from '../queries/investmentCompanyGroupQueries'
import { toInvestmentCompanyGroup, type InvestmentCompanyGroup } from '../types/investmentCompanyGroupTypes'

export interface InvestmentCompanyGroupAdditionalQuery<TResult = any> {
  query: string
  variables?: Record<string, any>
  data: (result: any) => TResult
  key: string
}

export interface UseInvestmentCompanyGroupOptions {
  additionalQueries?: InvestmentCompanyGroupAdditionalQuery[]
}

export interface UseInvestmentCompanyGroupResult {
  group: InvestmentCompanyGroup | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  [key: string]: any
}

export function useInvestmentCompanyGroup(
  accessToken: string,
  id: string | undefined,
  options?: UseInvestmentCompanyGroupOptions
): UseInvestmentCompanyGroupResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const additionalQueries = useMemo(() => options?.additionalQueries || [], [options?.additionalQueries])

  const [state, setState] = useState<Omit<UseInvestmentCompanyGroupResult, 'refetch'>>({
    group: null,
    loading: true,
    error: null,
    ...Object.fromEntries(additionalQueries.map(additionalQuery => [additionalQuery.key, undefined]))
  })

  const fetchGroup = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let combinedQuery = buildInvestmentCompanyGroupByIdQuery()

      if (additionalQueries.length > 0) {
        const additionalQueryBodies = additionalQueries.map(additionalQuery => additionalQuery.query).join('\n')
        const lastBraceIndex = combinedQuery.lastIndexOf('}')
        if (lastBraceIndex !== -1) {
          combinedQuery = combinedQuery.slice(0, lastBraceIndex) + `\n${additionalQueryBodies}\n}`
        }
      }

      const variables = {
        id,
        ...Object.assign({}, ...additionalQueries.map(additionalQuery => additionalQuery.variables || {}))
      }
      const result = await graphqlClient.request<{ InvestmentCompanyGroupByPk: any } & Record<string, any>>(
        combinedQuery,
        variables
      )
      const group = result.InvestmentCompanyGroupByPk
        ? toInvestmentCompanyGroup(result.InvestmentCompanyGroupByPk)
        : null
      const additionalData = Object.fromEntries(
        additionalQueries.map(additionalQuery => [additionalQuery.key, additionalQuery.data(result)])
      )

      setState({ group, loading: false, error: null, ...additionalData })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment company group'
      console.error('Error fetching investment company group:', error)
      setState({
        group: null,
        loading: false,
        error: errorMessage,
        ...Object.fromEntries(additionalQueries.map(additionalQuery => [additionalQuery.key, undefined]))
      })
    }
  }, [id, accessToken, graphqlClient, additionalQueries])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  return {
    ...state,
    refetch: fetchGroup
  }
}
