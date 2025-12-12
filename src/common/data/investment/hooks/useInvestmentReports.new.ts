/**
 * Investment Reports hook - list of investment reports with automatic state management
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildInvestmentReportFragment, INVESTMENT_REPORT_QUERY_CONFIGS } from '../queries/investmentReportQueries.new'
import { INVESTMENT_REPORT_DESCRIPTORS, type InvestmentReport } from '../types/investmentReportTypes'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import type { InvestmentReportQueryVariables } from '../queries/investmentReportQueries.new'

export interface UseInvestmentReportsResult {
  investmentReports: InvestmentReport[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a list of investment reports.
 * Automatically fetches data when component mounts or variables change.
 *
 * @param accessToken - Access token for authentication
 * @param variables - Query variables (where, orderBy, limit, offset, search)
 * @param config - Query config name or custom field array (default: 'list')
 *
 * @example
 * // Basic usage
 * const { investmentReports, total, loading, error } = useInvestmentReports(accessToken)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return (
 *   <Table dataSource={investmentReports}>
 *     ...
 *   </Table>
 * )
 *
 * @example
 * // With filters and pagination
 * const { investmentReports, total, loading, refetch } = useInvestmentReports(accessToken, {
 *   investmentId: 'some-id',
 *   limit: 20,
 *   offset: 0,
 *   orderBy: { date: 'DESC_NULLS_LAST' }
 * })
 */
export function useInvestmentReports(
  accessToken: string,
  variables: InvestmentReportQueryVariables = {},
  config: string | string[] = 'list'
): UseInvestmentReportsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentReportsResult, 'refetch'>>({
    investmentReports: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchInvestmentReports = useCallback(async () => {
    // Don't fetch if no access token
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Resolve fields from config
      const fields: string[] =
        typeof config === 'string'
          ? INVESTMENT_REPORT_QUERY_CONFIGS[config] || INVESTMENT_REPORT_QUERY_CONFIGS.list
          : config

      // Build fragment
      const fragment = buildInvestmentReportFragment(fields)

      // Build where condition
      const { search, investmentId, scope, ...restVariables } = variables
      const whereCondition = buildWhere(INVESTMENT_REPORT_DESCRIPTORS, restVariables, search)

      // Add custom conditions for investmentId and scope if provided
      if (investmentId) {
        whereCondition.investmentId = { _eq: investmentId }
      }
      if (scope) {
        whereCondition.scope = { _eq: scope }
      }

      // Build orderBy
      const orderBy = buildOrderBy(INVESTMENT_REPORT_DESCRIPTORS, variables.orderBy)

      // Build query
      const query = `
        query GetInvestmentReports(
          $where: InvestmentReport_bool_exp
          $orderBy: [InvestmentReport_order_by!]
          $limit: Int
          $offset: Int
        ) {
          InvestmentReport(
            where: $where
            orderBy: $orderBy
            limit: $limit
            offset: $offset
          ) {
            ${fragment}
          }
          InvestmentReport_aggregate(where: $where) {
            aggregate {
              count
            }
          }
        }
      `

      // Execute query
      const result = await graphqlClient.request<{
        InvestmentReport: any[]
        InvestmentReport_aggregate: {
          aggregate: {
            count: number
          }
        }
      }>(query, {
        where: whereCondition,
        orderBy,
        limit: variables.limit,
        offset: variables.offset
      })

      const investmentReports = (result.InvestmentReport || []) as InvestmentReport[]
      const total = result.InvestmentReport_aggregate?.aggregate?.count || 0

      setState({ investmentReports, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment reports'
      console.error('Error fetching investment reports:', error)
      setState({ investmentReports: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, variables])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchInvestmentReports()
  }, [fetchInvestmentReports])

  return {
    ...state,
    refetch: fetchInvestmentReports
  }
}
