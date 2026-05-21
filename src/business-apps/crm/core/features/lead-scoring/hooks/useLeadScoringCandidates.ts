import { useCallback, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildCustomerLeadOrderBy,
  buildCustomerLeadWhereCondition,
  type CustomerLeadQueryVariables
} from '@/common/data/customer/queries/customerLeadQueries'

export interface LeadScoringCandidate {
  id: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  createdAt?: string | null
  aiLeadScore?: number | null
  aiLeadGrade?: string | null
}

interface LeadScoringCandidateResponse {
  Lead: LeadScoringCandidate[]
  LeadAggregate?: {
    aggregate?: { count?: number | null } | null
  } | null
}

interface LeadScoringIdsResponse {
  Lead: Array<{ id: string }>
}

export interface LeadScoringCandidateQuery {
  search?: string
  createdAtFrom?: string
  createdAtTo?: string
  unscoredOnly?: boolean
}

const PAGE_SIZE = 50

const LEAD_SCORING_CANDIDATES_QUERY = `
  query GetLeadScoringCandidates($limit: Int!, $offset: Int!, $where: LeadBoolExp, $orderBy: [LeadOrderBy!]) {
    Lead(limit: $limit, offset: $offset, where: $where, orderBy: $orderBy) {
      id
      firstName
      lastName
      companyName
      createdAt
      aiLeadScore
      aiLeadGrade
    }
    LeadAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

const LEAD_SCORING_IDS_QUERY = `
  query GetLeadScoringIds($limit: Int!, $offset: Int!, $where: LeadBoolExp, $orderBy: [LeadOrderBy!]) {
    Lead(limit: $limit, offset: $offset, where: $where, orderBy: $orderBy) {
      id
    }
  }
`

const LEAD_UNSCORED_IN_WINDOW_QUERY = `
  query GetUnscoredLeadsInWindow($where: LeadBoolExp!) {
    Lead(where: $where) {
      id
    }
  }
`

const toUniqueLeadIds = (leads: Array<{ id: string }>): string[] => Array.from(new Set(leads.map(lead => lead.id)))

export const toLeadWindowQuery = (query: LeadScoringCandidateQuery): LeadScoringCandidateQuery => ({
  search: query.search?.trim() || undefined,
  createdAtFrom: query.createdAtFrom,
  createdAtTo: query.createdAtTo
})

function buildVariables(
  query: LeadScoringCandidateQuery,
  limit: number,
  offset: number,
  applyUnscoredFilter = Boolean(query.unscoredOnly)
): Record<string, unknown> {
  const variables: CustomerLeadQueryVariables = {
    limit,
    offset,
    search: query.search?.trim() || undefined,
    createdAtFrom: query.createdAtFrom,
    createdAtTo: query.createdAtTo,
    orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
  }
  const customConditions = applyUnscoredFilter ? [{ aiLeadScore: { _isNull: true } }] : []

  return {
    limit,
    offset,
    where: buildCustomerLeadWhereCondition(variables, [], customConditions),
    orderBy: buildCustomerLeadOrderBy(variables.orderBy)
  }
}

function buildUnscoredInWindowWhere(windowLeadIds: string[]): Record<string, unknown> {
  return {
    isDeleted: { _eq: false },
    id: { _in: windowLeadIds },
    aiLeadScore: { _isNull: true }
  }
}

export function useLeadScoringCandidates(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [items, setItems] = useState<LeadScoringCandidate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (query: LeadScoringCandidateQuery, offset: number, append: boolean) => {
      if (!accessToken.trim()) return

      setLoading(true)
      setError(null)

      try {
        const variables = buildVariables(query, PAGE_SIZE, offset)
        const result = await graphqlClient.request<LeadScoringCandidateResponse>(
          LEAD_SCORING_CANDIDATES_QUERY,
          variables
        )
        const nextItems = result.Lead ?? []
        setItems(previous => (append ? [...previous, ...nextItems] : nextItems))
        setTotal(result.LeadAggregate?.aggregate?.count ?? nextItems.length)
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load leads for scoring.')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  const loadFirstPage = useCallback((query: LeadScoringCandidateQuery) => fetchPage(query, 0, false), [fetchPage])

  const loadMore = useCallback(
    (query: LeadScoringCandidateQuery) => {
      if (loading || items.length >= total) return
      fetchPage(query, items.length, true).catch(() => {})
    },
    [fetchPage, items.length, loading, total]
  )

  const fetchLeadIds = useCallback(
    async (query: LeadScoringCandidateQuery, limit: number): Promise<string[]> => {
      const windowQuery = toLeadWindowQuery(query)
      const variables = buildVariables(windowQuery, limit, 0, false)
      const result = await graphqlClient.request<LeadScoringIdsResponse>(LEAD_SCORING_IDS_QUERY, variables)
      return toUniqueLeadIds(result.Lead ?? [])
    },
    [graphqlClient]
  )

  /** Among the latest `windowSize` leads (by createdAt), return only those without an AI score. */
  const fetchUnscoredLeadIdsWithinWindow = useCallback(
    async (windowQuery: LeadScoringCandidateQuery, windowSize: number): Promise<string[]> => {
      const baseQuery = toLeadWindowQuery(windowQuery)
      const windowVariables = buildVariables(baseQuery, windowSize, 0, false)
      const windowResult = await graphqlClient.request<LeadScoringIdsResponse>(LEAD_SCORING_IDS_QUERY, windowVariables)
      const windowLeadIds = toUniqueLeadIds(windowResult.Lead ?? [])

      if (windowLeadIds.length === 0) {
        return []
      }

      const unscoredResult = await graphqlClient.request<LeadScoringIdsResponse>(LEAD_UNSCORED_IN_WINDOW_QUERY, {
        where: buildUnscoredInWindowWhere(windowLeadIds)
      })

      return toUniqueLeadIds(unscoredResult.Lead ?? [])
    },
    [graphqlClient]
  )

  const fetchAllLeadIds = useCallback(
    async (query: LeadScoringCandidateQuery): Promise<string[]> => {
      const countVariables = buildVariables(query, 1, 0, true)
      const countResult = await graphqlClient.request<LeadScoringCandidateResponse>(
        LEAD_SCORING_CANDIDATES_QUERY,
        countVariables
      )
      const count = countResult.LeadAggregate?.aggregate?.count ?? 0

      if (count <= 0) {
        return []
      }

      const variables = buildVariables(query, count, 0, true)
      const result = await graphqlClient.request<LeadScoringIdsResponse>(LEAD_SCORING_IDS_QUERY, variables)
      return toUniqueLeadIds(result.Lead ?? [])
    },
    [graphqlClient]
  )

  return {
    items,
    total,
    loading,
    error,
    hasMore: items.length < total,
    loadFirstPage,
    loadMore,
    fetchLeadIds,
    fetchUnscoredLeadIdsWithinWindow,
    fetchAllLeadIds
  }
}
