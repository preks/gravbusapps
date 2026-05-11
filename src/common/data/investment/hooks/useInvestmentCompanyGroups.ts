import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInvestmentCompanyGroupOrderBy,
  buildInvestmentCompanyGroupQuery,
  buildInvestmentCompanyGroupWhereCondition,
  type InvestmentCompanyGroupQueryVariables
} from '../queries/investmentCompanyGroupQueries'
import { toInvestmentCompanyGroup, type InvestmentCompanyGroup } from '../types/investmentCompanyGroupTypes'

const DEFAULT_GROUP_QUERY_VARIABLES: InvestmentCompanyGroupQueryVariables = {}

export interface UseInvestmentCompanyGroupsResult {
  groups: InvestmentCompanyGroup[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: InvestmentCompanyGroupQueryVariables) => Promise<void>
}

export function useInvestmentCompanyGroups(
  accessToken: string,
  variables: InvestmentCompanyGroupQueryVariables = DEFAULT_GROUP_QUERY_VARIABLES
): UseInvestmentCompanyGroupsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState<Omit<UseInvestmentCompanyGroupsResult, 'refetch'>>({
    groups: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchGroups = useCallback(
    async (fetchVariables?: InvestmentCompanyGroupQueryVariables) => {
      const vars = { ...stableVariables, ...fetchVariables }

      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const query = buildInvestmentCompanyGroupQuery()
        const where = buildInvestmentCompanyGroupWhereCondition(vars)
        const orderBy = buildInvestmentCompanyGroupOrderBy(
          vars.orderBy?.length ? vars.orderBy : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
        )

        const result = await graphqlClient.request<{
          InvestmentCompanyGroup: any[]
          InvestmentCompanyGroupAggregate?: { aggregate?: { count?: number } | null } | null
        }>(query, {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where,
          orderBy
        })

        setState({
          groups: (result.InvestmentCompanyGroup || []).map(toInvestmentCompanyGroup),
          total: result.InvestmentCompanyGroupAggregate?.aggregate?.count ?? 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment company groups'
        console.error('Error fetching investment company groups:', error)
        setState({ groups: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return {
    ...state,
    refetch: fetchGroups
  }
}
