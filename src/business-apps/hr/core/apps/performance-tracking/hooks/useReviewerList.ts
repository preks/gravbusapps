import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_REVIEWER_LIST,
  type GetReviewerListResponse,
  type ReviewerListApi
} from '../queries/performanceTrackingQueries'
import type { ReviewerListItem } from '../types'

function resolveEmployeeName(employee: ReviewerListApi['reviewerEmployee']): string {
  if (!employee) return 'Unknown'
  if (employee.displayName) return employee.displayName
  const parts = [employee.firstName, employee.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Unknown'
}

function mapReviewerListItem(api: ReviewerListApi): ReviewerListItem | null {
  if (!api.reviewerEmployeeId) return null
  return {
    reviewerEmployeeId: api.reviewerEmployeeId,
    reviewerName: resolveEmployeeName(api.reviewerEmployee)
  }
}

export interface UseReviewerListResult {
  reviewers: ReviewerListItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useReviewerList(accessToken: string | undefined): UseReviewerListResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [reviewers, setReviewers] = useState<ReviewerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReviewers = useCallback(async () => {
    if (!accessToken) {
      setReviewers([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetReviewerListResponse>(GET_REVIEWER_LIST)
      const list = result?.PerformanceEvaluationReviewer ?? []
      const mapped = list.map(mapReviewerListItem).filter((r): r is ReviewerListItem => r !== null)
      mapped.sort((a, b) => a.reviewerName.localeCompare(b.reviewerName))
      setReviewers(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reviewer list'
      setError(message)
      setReviewers([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchReviewers()
  }, [fetchReviewers])

  return { reviewers, loading, error, refetch: fetchReviewers }
}
