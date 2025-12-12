/**
 * Company hook - single company by ID with automatic state management
 * Following the pattern from useInvestment.new.ts
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildCompanyFragment, COMPANY_QUERY_CONFIGS } from '../queries/companyQueries'
import type { Company } from '../types/companyTypes'

export interface UseCompanyResult {
  company: Company | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single company by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Company ID to fetch
 * @param config - Query config name or custom field array (default: 'record')
 *
 * @example
 * // Basic usage
 * const { company, loading, error } = useCompany(accessToken, companyId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{company?.name}</div>
 *
 * @example
 * // With refetch
 * const { company, loading, refetch } = useCompany(accessToken, companyId)
 *
 * return (
 *   <div>
 *     <div>{company?.name}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCompany(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseCompanyResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseCompanyResult, 'refetch'>>({
    company: null,
    loading: true,
    error: null
  })

  const fetchCompany = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Resolve fields from config
      const fields: string[] =
        typeof config === 'string' ? COMPANY_QUERY_CONFIGS[config] || COMPANY_QUERY_CONFIGS.record : config

      // Build fragment
      const fragment = buildCompanyFragment(fields)

      // Build query
      const query = `
        query GetCompanyByPk($id: uuid!) {
          CompanyByPk(id: $id) {
            ${fragment}
          }
        }
      `

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{
        CompanyByPk: Company | null
      }>(query, { id })

      const company = result.CompanyByPk

      setState({ company, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company'
      console.error('Error fetching company:', error)
      setState({ company: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return {
    ...state,
    refetch: fetchCompany
  }
}
