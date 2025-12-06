/**
 * Investment Report hook - single investment report by ID with automatic state management
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildInvestmentReportFragment, INVESTMENT_REPORT_QUERY_CONFIGS } from '../queries/investmentReportQueries.new'
import { type InvestmentReport } from '../types/investmentReportTypes'

export interface UseInvestmentReportResult {
  investmentReport: InvestmentReport | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment report by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Investment Report ID to fetch
 * @param config - Query config name or custom field array (default: 'record')
 *
 * @example
 * // Basic usage
 * const { investmentReport, loading, error } = useInvestmentReport(accessToken, reportId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{investmentReport?.date}</div>
 *
 * @example
 * // With refetch
 * const { investmentReport, loading, refetch } = useInvestmentReport(accessToken, reportId)
 *
 * return (
 *   <div>
 *     <div>{investmentReport?.date}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentReport(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseInvestmentReportResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentReportResult, 'refetch'>>({
    investmentReport: null,
    loading: true,
    error: null
  })

  const fetchInvestmentReport = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Resolve fields from config
      const fields: string[] =
        typeof config === 'string'
          ? INVESTMENT_REPORT_QUERY_CONFIGS[config] || INVESTMENT_REPORT_QUERY_CONFIGS.record
          : config

      // Build fragment
      const fragment = buildInvestmentReportFragment(fields)

      // Build query
      const query = `
        query GetInvestmentReportByPk($id: uuid!) {
          InvestmentReportByPk(id: $id) {
            ${fragment}
          }
        }
      `

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{
        InvestmentReportByPk: any
      }>(query, { id })

      const investmentReport = result.InvestmentReportByPk as InvestmentReport | null

      setState({ investmentReport, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment report'
      console.error('Error fetching investment report:', error)
      setState({ investmentReport: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchInvestmentReport()
  }, [fetchInvestmentReport])

  return {
    ...state,
    refetch: fetchInvestmentReport
  }
}
