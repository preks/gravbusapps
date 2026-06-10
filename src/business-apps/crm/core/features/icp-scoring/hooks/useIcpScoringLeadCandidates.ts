import { useCallback, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import icpScoringI18n from '@/common/components/icp-scoring/_i18n'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildCustomerLeadOrderBy,
  buildCustomerLeadWhereCondition,
  type CustomerLeadQueryVariables
} from '@/common/data/customer/queries/customerLeadQueries'
import type {
  IcpScoringCandidate,
  IcpScoringCandidateQuery,
  IcpScoringCandidatesApi
} from '../types/icpScoringCandidateTypes'

interface IcpScoringLeadCandidateRow {
  id: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}

interface IcpScoringLeadCandidateResponse {
  Lead: IcpScoringLeadCandidateRow[]
  LeadAggregate?: {
    aggregate?: { count?: number | null } | null
  } | null
}

interface IcpScoringLeadIdsResponse {
  Lead: Array<{ id: string }>
}

const PAGE_SIZE = 50

const ICP_SCORING_LEAD_CANDIDATES_QUERY = `
  query GetIcpScoringLeadCandidates($limit: Int!, $offset: Int!, $where: LeadBoolExp, $orderBy: [LeadOrderBy!]) {
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

const ICP_SCORING_LEAD_IDS_QUERY = `
  query GetIcpScoringLeadIds($limit: Int!, $offset: Int!, $where: LeadBoolExp, $orderBy: [LeadOrderBy!]) {
    Lead(limit: $limit, offset: $offset, where: $where, orderBy: $orderBy) {
      id
    }
  }
`

const ICP_SCORING_LEAD_UNSCORED_IN_WINDOW_QUERY = `
  query GetUnscoredLeadsInWindow($where: LeadBoolExp!) {
    Lead(where: $where) {
      id
    }
  }
`

function toLeadCandidate(row: IcpScoringLeadCandidateRow): IcpScoringCandidate {
  const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  return {
    id: row.id,
    title: name || 'Unnamed lead',
    subtitle: row.companyName
  }
}

const toUniqueIds = (rows: Array<{ id: string }>): string[] => Array.from(new Set(rows.map(row => row.id)))

const toWindowQuery = (query: IcpScoringCandidateQuery): IcpScoringCandidateQuery => ({
  search: query.search?.trim() || undefined,
  createdAtFrom: query.createdAtFrom,
  createdAtTo: query.createdAtTo
})

function buildVariables(
  query: IcpScoringCandidateQuery,
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

function buildUnscoredInWindowWhere(windowIds: string[]): Record<string, unknown> {
  return {
    isDeleted: { _eq: false },
    id: { _in: windowIds },
    aiLeadScore: { _isNull: true }
  }
}

export function useIcpScoringLeadCandidates(accessToken: string): IcpScoringCandidatesApi {
  const { t } = useTranslation(icpScoringI18n)
  const loadErrorMessage = t('icp-scoring-candidates-load-error-lead')
  const graphqlClient = useGraphQLClient(accessToken)
  const [items, setItems] = useState<IcpScoringCandidate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (query: IcpScoringCandidateQuery, offset: number, append: boolean) => {
      if (!accessToken.trim()) return

      setLoading(true)
      setError(null)

      try {
        const variables = buildVariables(query, PAGE_SIZE, offset)
        const result = await graphqlClient.request<IcpScoringLeadCandidateResponse>(
          ICP_SCORING_LEAD_CANDIDATES_QUERY,
          variables
        )
        const nextItems = (result.Lead ?? []).map(toLeadCandidate)
        setItems(previous => (append ? [...previous, ...nextItems] : nextItems))
        setTotal(result.LeadAggregate?.aggregate?.count ?? nextItems.length)
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : loadErrorMessage)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient, loadErrorMessage]
  )

  const loadFirstPage = useCallback((query: IcpScoringCandidateQuery) => fetchPage(query, 0, false), [fetchPage])

  const loadMore = useCallback(
    (query: IcpScoringCandidateQuery) => {
      if (loading || items.length >= total) return
      fetchPage(query, items.length, true).catch(() => {})
    },
    [fetchPage, items.length, loading, total]
  )

  const fetchEntityIds = useCallback(
    async (query: IcpScoringCandidateQuery, limit: number): Promise<string[]> => {
      const windowQuery = toWindowQuery(query)
      const variables = buildVariables(windowQuery, limit, 0, false)
      const result = await graphqlClient.request<IcpScoringLeadIdsResponse>(ICP_SCORING_LEAD_IDS_QUERY, variables)
      return toUniqueIds(result.Lead ?? [])
    },
    [graphqlClient]
  )

  const fetchUnscoredEntityIdsWithinWindow = useCallback(
    async (query: IcpScoringCandidateQuery, windowSize: number): Promise<string[]> => {
      const baseQuery = toWindowQuery(query)
      const windowVariables = buildVariables(baseQuery, windowSize, 0, false)
      const windowResult = await graphqlClient.request<IcpScoringLeadIdsResponse>(
        ICP_SCORING_LEAD_IDS_QUERY,
        windowVariables
      )
      const windowIds = toUniqueIds(windowResult.Lead ?? [])

      if (windowIds.length === 0) {
        return []
      }

      const unscoredResult = await graphqlClient.request<IcpScoringLeadIdsResponse>(
        ICP_SCORING_LEAD_UNSCORED_IN_WINDOW_QUERY,
        {
          where: buildUnscoredInWindowWhere(windowIds)
        }
      )

      return toUniqueIds(unscoredResult.Lead ?? [])
    },
    [graphqlClient]
  )

  const fetchAllEntityIds = useCallback(
    async (query: IcpScoringCandidateQuery): Promise<string[]> => {
      const countVariables = buildVariables(query, 1, 0, true)
      const countResult = await graphqlClient.request<IcpScoringLeadCandidateResponse>(
        ICP_SCORING_LEAD_CANDIDATES_QUERY,
        countVariables
      )
      const count = countResult.LeadAggregate?.aggregate?.count ?? 0

      if (count <= 0) {
        return []
      }

      const variables = buildVariables(query, count, 0, true)
      const result = await graphqlClient.request<IcpScoringLeadIdsResponse>(ICP_SCORING_LEAD_IDS_QUERY, variables)
      return toUniqueIds(result.Lead ?? [])
    },
    [graphqlClient]
  )

  return {
    items,
    total,
    loading,
    error,
    loadFirstPage,
    loadMore,
    fetchEntityIds,
    fetchUnscoredEntityIdsWithinWindow,
    fetchAllEntityIds
  }
}
