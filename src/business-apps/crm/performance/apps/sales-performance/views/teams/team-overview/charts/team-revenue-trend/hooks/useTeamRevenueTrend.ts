import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { TimeFilter } from '../../../../../../types'
import { generateTimePeriods } from '../../../../../../utils/timePeriods'
import { buildTeamRevenueTrendQuery } from '../data/teamRevenueTrendQueries'
import { mapTeamRevenueTrendResponse } from '../data/mapTeamRevenueTrendResponse'
import type { TeamRevenueTrendPoint } from '../types'

interface UseTeamRevenueTrendProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode?: string
  timeFilter?: TimeFilter
}

interface UseTeamRevenueTrendResult {
  revenueTrend: TeamRevenueTrendPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useTeamRevenueTrend = ({
  accessToken,
  teamMemberIds,
  currencyCode = 'EUR',
  timeFilter = 'sixMonths'
}: UseTeamRevenueTrendProps): UseTeamRevenueTrendResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [revenueTrend, setRevenueTrend] = useState<TeamRevenueTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRevenueTrend = useCallback(async () => {
    if (!accessToken || teamMemberIds.length === 0) {
      setRevenueTrend([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const periods = generateTimePeriods(timeFilter)
      const query = buildTeamRevenueTrendQuery(teamMemberIds, periods, currencyCode)
      const response = await graphqlClient.request<Record<string, unknown>>(query)
      setRevenueTrend(mapTeamRevenueTrendResponse(response, periods))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team revenue trend')
      setRevenueTrend([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currencyCode, graphqlClient, teamMemberIds, timeFilter])

  useEffect(() => {
    fetchRevenueTrend().catch(() => undefined)
  }, [fetchRevenueTrend])

  return {
    revenueTrend,
    isLoading,
    error,
    refetch: () => {
      fetchRevenueTrend().catch(() => undefined)
    }
  }
}
