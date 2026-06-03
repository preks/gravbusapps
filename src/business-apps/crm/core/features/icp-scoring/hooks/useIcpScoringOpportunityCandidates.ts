import { useCallback, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import icpScoringI18n from '@/common/components/icp-scoring/_i18n'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildCustomerOpportunityOrderBy,
  buildCustomerOpportunityWhereCondition,
  type CustomerOpportunityQueryVariables
} from '@/common/data/customer/queries/customerOpportunityQueries'
import type {
  IcpScoringCandidate,
  IcpScoringCandidateQuery,
  IcpScoringCandidatesApi
} from '../types/icpScoringCandidateTypes'

interface IcpScoringOpportunityCandidateRow {
  id: string
  name?: string | null
  code?: string | null
}

interface IcpScoringOpportunityCandidateResponse {
  Opportunity: IcpScoringOpportunityCandidateRow[]
  OpportunityAggregate?: {
    aggregate?: { count?: number | null } | null
  } | null
}

interface IcpScoringOpportunityIdsResponse {
  Opportunity: Array<{ id: string }>
}

const PAGE_SIZE = 50

const ICP_SCORING_OPPORTUNITY_CANDIDATES_QUERY = `
  query GetIcpScoringOpportunityCandidates($limit: Int!, $offset: Int!, $where: OpportunityBoolExp, $orderBy: [OpportunityOrderBy!]) {
    Opportunity(limit: $limit, offset: $offset, where: $where, orderBy: $orderBy) {
      id
      name
      code
      createdAt
      aiOpportunityScore
      aiOpportunityGrade
    }
    OpportunityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

const ICP_SCORING_OPPORTUNITY_IDS_QUERY = `
  query GetIcpScoringOpportunityIds($limit: Int!, $offset: Int!, $where: OpportunityBoolExp, $orderBy: [OpportunityOrderBy!]) {
    Opportunity(limit: $limit, offset: $offset, where: $where, orderBy: $orderBy) {
      id
    }
  }
`

const ICP_SCORING_OPPORTUNITY_UNSCORED_IN_WINDOW_QUERY = `
  query GetUnscoredOpportunitiesInWindow($where: OpportunityBoolExp!) {
    Opportunity(where: $where) {
      id
    }
  }
`

function toOpportunityCandidate(row: IcpScoringOpportunityCandidateRow): IcpScoringCandidate {
  return {
    id: row.id,
    title: row.name?.trim() || row.code?.trim() || 'Unnamed opportunity',
    subtitle: row.code
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
  const variables: CustomerOpportunityQueryVariables = {
    limit,
    offset,
    search: query.search?.trim() || undefined,
    createdAtFrom: query.createdAtFrom,
    createdAtTo: query.createdAtTo,
    orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
  }
  const customConditions = applyUnscoredFilter ? [{ aiOpportunityScore: { _isNull: true } }] : []

  return {
    limit,
    offset,
    where: buildCustomerOpportunityWhereCondition(variables, [], customConditions),
    orderBy: buildCustomerOpportunityOrderBy(variables.orderBy)
  }
}

function buildUnscoredInWindowWhere(windowIds: string[]): Record<string, unknown> {
  return {
    isDeleted: { _eq: false },
    id: { _in: windowIds },
    aiOpportunityScore: { _isNull: true }
  }
}

export function useIcpScoringOpportunityCandidates(accessToken: string): IcpScoringCandidatesApi {
  const { t } = useTranslation(icpScoringI18n)
  const loadErrorMessage = t('icp-scoring-candidates-load-error-opportunity')
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
        const result = await graphqlClient.request<IcpScoringOpportunityCandidateResponse>(
          ICP_SCORING_OPPORTUNITY_CANDIDATES_QUERY,
          variables
        )
        const nextItems = (result.Opportunity ?? []).map(toOpportunityCandidate)
        setItems(previous => (append ? [...previous, ...nextItems] : nextItems))
        setTotal(result.OpportunityAggregate?.aggregate?.count ?? nextItems.length)
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
      const result = await graphqlClient.request<IcpScoringOpportunityIdsResponse>(
        ICP_SCORING_OPPORTUNITY_IDS_QUERY,
        variables
      )
      return toUniqueIds(result.Opportunity ?? [])
    },
    [graphqlClient]
  )

  const fetchUnscoredEntityIdsWithinWindow = useCallback(
    async (query: IcpScoringCandidateQuery, windowSize: number): Promise<string[]> => {
      const baseQuery = toWindowQuery(query)
      const windowVariables = buildVariables(baseQuery, windowSize, 0, false)
      const windowResult = await graphqlClient.request<IcpScoringOpportunityIdsResponse>(
        ICP_SCORING_OPPORTUNITY_IDS_QUERY,
        windowVariables
      )
      const windowIds = toUniqueIds(windowResult.Opportunity ?? [])

      if (windowIds.length === 0) {
        return []
      }

      const unscoredResult = await graphqlClient.request<IcpScoringOpportunityIdsResponse>(
        ICP_SCORING_OPPORTUNITY_UNSCORED_IN_WINDOW_QUERY,
        {
          where: buildUnscoredInWindowWhere(windowIds)
        }
      )

      return toUniqueIds(unscoredResult.Opportunity ?? [])
    },
    [graphqlClient]
  )

  const fetchAllEntityIds = useCallback(
    async (query: IcpScoringCandidateQuery): Promise<string[]> => {
      const countVariables = buildVariables(query, 1, 0, true)
      const countResult = await graphqlClient.request<IcpScoringOpportunityCandidateResponse>(
        ICP_SCORING_OPPORTUNITY_CANDIDATES_QUERY,
        countVariables
      )
      const count = countResult.OpportunityAggregate?.aggregate?.count ?? 0

      if (count <= 0) {
        return []
      }

      const variables = buildVariables(query, count, 0, true)
      const result = await graphqlClient.request<IcpScoringOpportunityIdsResponse>(
        ICP_SCORING_OPPORTUNITY_IDS_QUERY,
        variables
      )
      return toUniqueIds(result.Opportunity ?? [])
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
