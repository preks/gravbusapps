import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { TimeFilter } from '../../../../../../types'
import { generateTimePeriods } from '../../../../../../utils/timePeriods'
import { buildOpportunityOutcomesQuery } from '../data/opportunityOutcomesQueries'
import { mapOpportunityOutcomesResponse } from '../data/mapOpportunityOutcomesResponse'
import type { OpportunityOutcomesPoint } from '../types'

interface UseOpportunityOutcomesProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode?: string
  timeFilter?: TimeFilter
}

interface UseOpportunityOutcomesResult {
  outcomesTrend: OpportunityOutcomesPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useOpportunityOutcomes = ({
  accessToken,
  teamMemberIds,
  currencyCode = 'EUR',
  timeFilter = 'sixMonths'
}: UseOpportunityOutcomesProps): UseOpportunityOutcomesResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [outcomesTrend, setOutcomesTrend] = useState<OpportunityOutcomesPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOutcomesTrend = useCallback(async () => {
    if (!accessToken || teamMemberIds.length === 0) {
      setOutcomesTrend([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const periods = generateTimePeriods(timeFilter)
      const query = buildOpportunityOutcomesQuery(teamMemberIds, periods, currencyCode)
      const response = await graphqlClient.request<Record<string, unknown>>(query)
      setOutcomesTrend(mapOpportunityOutcomesResponse(response, periods))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunity outcomes')
      setOutcomesTrend([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currencyCode, graphqlClient, teamMemberIds, timeFilter])

  useEffect(() => {
    fetchOutcomesTrend().catch(() => undefined)
  }, [fetchOutcomesTrend])

  return {
    outcomesTrend,
    isLoading,
    error,
    refetch: () => {
      fetchOutcomesTrend().catch(() => undefined)
    }
  }
}
