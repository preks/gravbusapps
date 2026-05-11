import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInvestmentCompanyOrderBy,
  buildInvestmentCompanyQuery,
  buildInvestmentCompanyWhereCondition,
  type InvestmentCompanyQueryVariables
} from '../queries/investmentCompanyQueries'
import { toInvestmentCompany, type InvestmentCompany } from '../types/investmentCompanyTypes'

const DEFAULT_COMPANY_QUERY_VARIABLES: InvestmentCompanyQueryVariables = {}

export interface UseInvestmentCompaniesResult {
  companies: InvestmentCompany[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: InvestmentCompanyQueryVariables) => Promise<void>
}

export function useInvestmentCompanies(
  accessToken: string,
  variables: InvestmentCompanyQueryVariables = DEFAULT_COMPANY_QUERY_VARIABLES
): UseInvestmentCompaniesResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState<Omit<UseInvestmentCompaniesResult, 'refetch'>>({
    companies: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchCompanies = useCallback(
    async (fetchVariables?: InvestmentCompanyQueryVariables) => {
      const vars = { ...stableVariables, ...fetchVariables }

      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const query = buildInvestmentCompanyQuery()
        const where = buildInvestmentCompanyWhereCondition(vars)
        const orderBy = buildInvestmentCompanyOrderBy(
          vars.orderBy?.length ? vars.orderBy : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
        )

        const result = await graphqlClient.request<{
          InvestmentCompany: any[]
          InvestmentCompanyAggregate?: { aggregate?: { count?: number } | null } | null
        }>(query, {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where,
          orderBy
        })

        setState({
          companies: (result.InvestmentCompany || []).map(toInvestmentCompany),
          total: result.InvestmentCompanyAggregate?.aggregate?.count ?? 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment companies'
        console.error('Error fetching investment companies:', error)
        setState({ companies: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  return {
    ...state,
    refetch: fetchCompanies
  }
}
