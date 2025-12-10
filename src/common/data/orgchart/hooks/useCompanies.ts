/**
 * Companies hook - list of companies with automatic state management
 * Following the pattern from useInvestments.new.ts
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { COMPANY_DESCRIPTORS } from '../types/companyTypes'
import { buildCompanyFragment, COMPANY_QUERY_CONFIGS, type CompanyQueryVariables } from '../queries/companyQueries'
import type { Company } from '../types/companyTypes'

export interface UseCompaniesResult {
  companies: Company[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: CompanyQueryVariables) => Promise<void>
}

/**
 * Declarative hook for fetching a list of companies.
 * Automatically fetches data when component mounts or variables change.
 *
 * @param accessToken - Access token for authentication
 * @param variables - Query variables for filtering, pagination, sorting, etc.
 * @param config - Query config name or custom field array (default: 'list')
 *
 * @example
 * // Basic usage
 * const { companies, total, loading, error } = useCompanies(accessToken, { limit: 20 })
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return (
 *   <div>
 *     <p>Total: {total}</p>
 *     {companies.map(company => <div key={company.id}>{company.name}</div>)}
 *   </div>
 * )
 *
 * @example
 * // With refetch
 * const { companies, refetch } = useCompanies(accessToken, { search: 'test' })
 *
 * return (
 *   <div>
 *     <Button onClick={() => refetch({ search: 'new search' })}>Search</Button>
 *     {companies.map(company => <div key={company.id}>{company.name}</div>)}
 *   </div>
 * )
 */
export function useCompanies(
  accessToken: string,
  variables: CompanyQueryVariables = {},
  config: string | string[] = 'list'
): UseCompaniesResult {
  const graphqlClient = useGraphQLClient(accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState<Omit<UseCompaniesResult, 'refetch'>>({
    companies: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchCompanies = useCallback(
    async (fetchVariables?: CompanyQueryVariables) => {
      // Merge stable default variables with query-specific variables
      const vars = { ...stableVariables, ...fetchVariables }

      // Don't fetch if no access token
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // Resolve fields from config
        const fields: string[] =
          typeof config === 'string' ? COMPANY_QUERY_CONFIGS[config] || COMPANY_QUERY_CONFIGS.list : config

        // Build fragment
        const fragment = buildCompanyFragment(fields)

        // Build where condition using descriptors
        const whereObj = buildWhere({
          variables: vars,
          descriptors: COMPANY_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })

        // Build orderBy using descriptors
        // Use default orderBy if none provided
        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'name', direction: 'ASC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, COMPANY_DESCRIPTORS)

        // Build GraphQL variables
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0

        const graphQLVariables: Record<string, any> = {
          limit,
          offset,
          where: whereObj,
          orderBy: orderByArray
        }

        // Build query
        const query = `
          query GetCompanies(
            $limit: Int
            $offset: Int
            $where: CompanyBoolExp
            $orderBy: [CompanyOrderBy!]
          ) {
            Company(
              limit: $limit
              offset: $offset
              orderBy: $orderBy
              where: $where
            ) {
              ${fragment}
            }
            
            CompanyAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        // Execute query
        const result = await graphqlClient.request<{
          Company: Company[]
          CompanyAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query, graphQLVariables)

        setState({
          companies: result.Company || [],
          total: result.CompanyAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch companies'
        console.error('Error fetching companies:', error)
        setState({
          companies: [],
          total: 0,
          loading: false,
          error: errorMessage
        })
      }
    },
    [accessToken, graphqlClient, config, stableVariables]
  )

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  return {
    ...state,
    refetch: fetchCompanies
  }
}
