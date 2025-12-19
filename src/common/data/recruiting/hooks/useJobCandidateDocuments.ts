/**
 * JobCandidateDocuments hook - list of documents for a candidate
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobCandidateDocumentFragment,
  JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS,
  type JobCandidateDocumentQueryVariables
} from '../queries/jobCandidateDocumentQueries'
import { type JobCandidateDocument } from '../types/jobCandidateDocumentTypes'
import { buildWhereCondition, buildOrderByClause, type OrderBy } from '@/common/network/graphql/queryHelpers'
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
  orderBy?: OrderBy[]
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

      const whereCondition = buildWhereCondition(params, JOB_CANDIDATE_DOCUMENT_DESCRIPTORS)
      const orderByClause = buildOrderByClause(params.orderBy || [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const query = `
        query GetJobCandidateDocuments($limit: Int, $offset: Int) {
          JobCandidateDocument(
            where: ${whereCondition}
            limit: $limit
            offset: $offset
            order_by: ${orderByClause}
          ) {
            ${fragment}
          }
          JobCandidateDocumentAggregate(where: ${whereCondition}) {
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
        limit: params.limit || 20,
        offset: params.offset || 0
      })

      const documents = result.JobCandidateDocument as JobCandidateDocument[]
      const total = result.JobCandidateDocumentAggregate?.aggregate?.count || 0

      setState({ documents, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch candidate documents'
      console.error('Error fetching candidate documents:', error)
      setState({ documents: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, params])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    ...state,
    refetch: fetchDocuments
  }
}
