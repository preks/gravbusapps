/**
 * JobOffers hook - list of job offers with filtering, sorting, pagination
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobOfferFragment, JOB_OFFER_QUERY_CONFIGS, type JobOfferQueryVariables } from '../queries/jobOfferQueries'
import { type JobOffer } from '../types/jobOfferTypes'
import { buildWhereCondition, buildOrderByClause, type OrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_OFFER_DESCRIPTORS } from '../types/jobOfferTypes'

export interface UseJobOffersResult {
  jobOffers: JobOffer[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseJobOffersParams extends Partial<JobOfferQueryVariables> {
  search?: string
  limit?: number
  offset?: number
  orderBy?: OrderBy[]
}

/**
 * Declarative hook for fetching a list of job offers with filtering and pagination.
 *
 * @param accessToken - Access token for authentication
 * @param params - Query parameters (filters, pagination, sorting)
 * @param config - Query config name or custom field array (default: 'list')
 */
export function useJobOffers(
  accessToken: string,
  params: UseJobOffersParams = {},
  config: string | string[] = 'list'
): UseJobOffersResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobOffersResult, 'refetch'>>({
    jobOffers: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobOffers = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string' ? JOB_OFFER_QUERY_CONFIGS[config] || JOB_OFFER_QUERY_CONFIGS.list : config

      const fragment = buildJobOfferFragment(fields)

      const whereCondition = buildWhereCondition(params, JOB_OFFER_DESCRIPTORS)
      const orderByClause = buildOrderByClause(params.orderBy || [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const query = `
        query GetJobOffers($limit: Int, $offset: Int) {
          JobOffer(
            where: ${whereCondition}
            limit: $limit
            offset: $offset
            order_by: ${orderByClause}
          ) {
            ${fragment}
          }
          JobOfferAggregate(where: ${whereCondition}) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        JobOffer: any[]
        JobOfferAggregate: { aggregate: { count: number } }
      }>(query, {
        limit: params.limit || 20,
        offset: params.offset || 0
      })

      const jobOffers = result.JobOffer as JobOffer[]
      const total = result.JobOfferAggregate?.aggregate?.count || 0

      setState({ jobOffers, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job offers'
      console.error('Error fetching job offers:', error)
      setState({ jobOffers: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, params])

  useEffect(() => {
    fetchJobOffers()
  }, [fetchJobOffers])

  return {
    ...state,
    refetch: fetchJobOffers
  }
}
