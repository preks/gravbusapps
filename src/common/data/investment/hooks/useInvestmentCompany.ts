import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildInvestmentCompanyByIdQuery } from '../queries/investmentCompanyQueries'
import { toInvestmentCompany, type InvestmentCompany } from '../types/investmentCompanyTypes'

export interface InvestmentCompanyAdditionalQuery<TResult = any> {
  query: string
  variables?: Record<string, any>
  data: (result: any) => TResult
  key: string
}

export interface UseInvestmentCompanyOptions {
  additionalQueries?: InvestmentCompanyAdditionalQuery[]
}

export interface UseInvestmentCompanyResult {
  company: InvestmentCompany | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  [key: string]: any
}

export function useInvestmentCompany(
  accessToken: string,
  id: string | undefined,
  options?: UseInvestmentCompanyOptions
): UseInvestmentCompanyResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const additionalQueries = useMemo(() => options?.additionalQueries || [], [options?.additionalQueries])

  const [state, setState] = useState<Omit<UseInvestmentCompanyResult, 'refetch'>>({
    company: null,
    loading: true,
    error: null,
    ...Object.fromEntries(additionalQueries.map(additionalQuery => [additionalQuery.key, undefined]))
  })

  const fetchCompany = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let combinedQuery = buildInvestmentCompanyByIdQuery()

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
      const result = await graphqlClient.request<{ InvestmentCompanyByPk: any } & Record<string, any>>(
        combinedQuery,
        variables
      )
      const company = result.InvestmentCompanyByPk
        ? toInvestmentCompany({
            ...result.InvestmentCompanyByPk,
            addresses: result.companyAddresses ?? []
          })
        : null
      const additionalData = Object.fromEntries(
        additionalQueries.map(additionalQuery => [additionalQuery.key, additionalQuery.data(result)])
      )

      setState({ company, loading: false, error: null, ...additionalData })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment company'
      console.error('Error fetching investment company:', error)
      setState({
        company: null,
        loading: false,
        error: errorMessage,
        ...Object.fromEntries(additionalQueries.map(additionalQuery => [additionalQuery.key, undefined]))
      })
    }
  }, [id, accessToken, graphqlClient, additionalQueries])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return {
    ...state,
    refetch: fetchCompany
  }
}
