import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { TimeFilter } from '../../../../../../types'
import { generateTimePeriods } from '../../../../../../utils/timePeriods'
import { buildWinRateTrendQuery } from '../data/winRateTrendQueries'
import { mapWinRateTrendResponse } from '../data/mapWinRateTrendResponse'
import type { WinRateTrendPoint } from '../types'

interface UseWinRateTrendProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode?: string
  timeFilter?: TimeFilter
}

interface UseWinRateTrendResult {
  winRateTrend: WinRateTrendPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useWinRateTrend = ({
  accessToken,
  teamMemberIds,
  currencyCode = 'EUR',
  timeFilter = 'sixMonths'
}: UseWinRateTrendProps): UseWinRateTrendResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [winRateTrend, setWinRateTrend] = useState<WinRateTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWinRateTrend = useCallback(async () => {
    if (!accessToken || teamMemberIds.length === 0) {
      setWinRateTrend([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const periods = generateTimePeriods(timeFilter)
      const query = buildWinRateTrendQuery(teamMemberIds, periods, currencyCode)
      const response = await graphqlClient.request<Record<string, unknown>>(query)
      setWinRateTrend(mapWinRateTrendResponse(response, periods))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load win rate trend')
      setWinRateTrend([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currencyCode, graphqlClient, teamMemberIds, timeFilter])

  useEffect(() => {
    fetchWinRateTrend().catch(() => undefined)
  }, [fetchWinRateTrend])

  return {
    winRateTrend,
    isLoading,
    error,
    refetch: () => {
      fetchWinRateTrend().catch(() => undefined)
    }
  }
}
