/**
 * JobPositions hook - list of job positions with automatic state management
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_POSITION_DESCRIPTORS, type JobPosition } from '../types/jobPositionTypes'
import {
  buildJobPositionFragment,
  JOB_POSITION_QUERY_CONFIGS,
  type JobPositionQueryVariables
} from '../queries/jobPositionQueries'

export interface UseJobPositionsResult {
  jobPositions: JobPosition[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobPositionQueryVariables) => Promise<void>
}

/**
 * Declarative hook for fetching a list of job positions.
 * Automatically fetches data when component mounts or variables change.
 *
 * @param accessToken - Access token for authentication
 * @param variables - Query variables for filtering, pagination, sorting, etc.
 * @param config - Query config name or custom field array (default: 'list')
 *
 * @example
 * // Basic usage
 * const { jobPositions, total, loading, error } = useJobPositions(accessToken, { limit: 20 })
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return (
 *   <div>
 *     <p>Total: {total}</p>
 *     {jobPositions.map(pos => <div key={pos.id}>{pos.name}</div>)}
 *   </div>
 * )
 *
 * @example
 * // With filters
 * const { jobPositions, refetch } = useJobPositions(accessToken, {
 *   structureId: '123',
 *   vacant: true,
 *   search: 'engineer'
 * })
 */
export function useJobPositions(
  accessToken: string,
  variables: JobPositionQueryVariables = {},
  config: string | string[] = 'list'
): UseJobPositionsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  // ⚠️ CRITICAL: Memoize variables to prevent infinite loops
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState<Omit<UseJobPositionsResult, 'refetch'>>({
    jobPositions: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobPositions = useCallback(
    async (fetchVariables?: JobPositionQueryVariables) => {
      const vars = { ...stableVariables, ...fetchVariables }

      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // Resolve fields from config
        const fields: string[] =
          typeof config === 'string' ? JOB_POSITION_QUERY_CONFIGS[config] || JOB_POSITION_QUERY_CONFIGS.list : config

        // Build fragment
        const fragment = buildJobPositionFragment(fields)

        // Handle custom conditions that are not part of standard descriptors
        const customConditions: Record<string, any>[] = []

        // Structure filter
        if (vars.structureId) {
          customConditions.push({
            organizationalUnitEmployees: {
              structureId: { _eq: vars.structureId }
            }
          })
        }

        // Vacancy filter
        if (vars.vacant !== undefined) {
          customConditions.push({
            organizationalUnitEmployees: {
              employeeId: { _isNull: vars.vacant }
            }
          })
        }

        // Remove custom variables before passing to buildWhere
        const filteredVars = { ...vars }
        delete filteredVars.structureId
        delete filteredVars.vacant

        // Build where condition
        const whereObj = buildWhere({
          variables: filteredVars,
          descriptors: JOB_POSITION_DESCRIPTORS,
          ids: filteredVars.ids,
          isDeleted: true,
          customConditions
        })

        // Build orderBy
        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'name', direction: 'ASC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_POSITION_DESCRIPTORS)

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
          query GetJobPositions(
            $limit: Int
            $offset: Int
            $where: JobPositionBoolExp
            $orderBy: [JobPositionOrderBy!]
          ) {
            JobPosition(
              limit: $limit
              offset: $offset
              orderBy: $orderBy
              where: $where
            ) {
              ${fragment}
            }
            
            JobPositionAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        // Execute query
        const result = await graphqlClient.request<{
          JobPosition: any[]
          JobPositionAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query, graphQLVariables)

        setState({
          jobPositions: (result.JobPosition || []) as JobPosition[],
          total: result.JobPositionAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job positions'
        console.error('Error fetching job positions:', error)
        setState({
          jobPositions: [],
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
    fetchJobPositions()
  }, [fetchJobPositions])

  return {
    ...state,
    refetch: fetchJobPositions
  }
}
