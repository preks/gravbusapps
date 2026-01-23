/**
 * JobCandidateDocuments hook - list of documents for a candidate
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobCandidateDocumentFragment,
  JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS,
  type JobCandidateDocumentQueryVariables
} from '../queries/jobCandidateDocumentQueries'
import { type JobCandidateDocument } from '../types/jobCandidateDocumentTypes'
import { buildWhere, buildOrderBy, type SortInput } from '@/common/network/graphql/queryHelpers'
import { JOB_CANDIDATE_DOCUMENT_DESCRIPTORS } from '../types/jobCandidateDocumentTypes'

export interface UseJobCandidateDocumentsResult {
  documents: JobCandidateDocument[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseJobCandidateDocumentsParams extends Partial<JobCandidateDocumentQueryVariables> {
  search?: string
  limit?: number
  offset?: number
  orderBy?: SortInput[]
}

export function useJobCandidateDocuments(
  accessToken: string,
  params: UseJobCandidateDocumentsParams = {},
  config: string | string[] = 'list'
): UseJobCandidateDocumentsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobCandidateDocumentsResult, 'refetch'>>({
    documents: [],
    total: 0,
    loading: true,
    error: null
  })

  // Memoize params to prevent infinite loops
  const stableParams = useMemo(() => params, [JSON.stringify(params)])

  const fetchDocuments = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS[config] || JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS.list
          : config

      const fragment = buildJobCandidateDocumentFragment(fields)

      const whereObj = buildWhere({
        variables: stableParams,
        descriptors: JOB_CANDIDATE_DOCUMENT_DESCRIPTORS,
        isDeleted: true
      })

      const orderByInput =
        stableParams.orderBy && stableParams.orderBy.length > 0
          ? stableParams.orderBy
          : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
      const orderByArray = buildOrderBy(orderByInput, JOB_CANDIDATE_DOCUMENT_DESCRIPTORS)

      const limit = stableParams.limit || 20
      const offset = stableParams.offset || 0

      const query = `
        query GetJobCandidateDocuments($limit: Int, $offset: Int, $where: JobCandidateDocumentBoolExp, $orderBy: [JobCandidateDocumentOrderBy!]) {
          JobCandidateDocument(
            where: $where
            limit: $limit
            offset: $offset
            orderBy: $orderBy
          ) {
            ${fragment}
          }
          JobCandidateDocumentAggregate(where: $where) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        JobCandidateDocument: any[]
        JobCandidateDocumentAggregate: { aggregate: { count: number } }
      }>(query, {
        limit,
        offset,
        where: whereObj,
        orderBy: orderByArray
      })

      const documents = result.JobCandidateDocument as JobCandidateDocument[]
      const total = result.JobCandidateDocumentAggregate?.aggregate?.count || 0

      setState({ documents, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch candidate documents'
      console.error('Error fetching candidate documents:', error)
      setState({ documents: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, stableParams])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    ...state,
    refetch: fetchDocuments
  }
}
