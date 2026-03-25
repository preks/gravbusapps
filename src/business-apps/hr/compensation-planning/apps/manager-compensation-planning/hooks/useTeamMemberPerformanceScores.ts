import { useCallback, useEffect, useMemo, useState } from 'react'

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

import {
  GET_PERFORMANCE_CYCLES,
  type GetPerformanceCyclesResponse
} from '@/business-apps/hr/core/apps/performance-evaluation/queries/performanceCycleQueries'

import {
  buildCompletedPerformanceCycleIdSet,
  resolveTeamPerformanceScore
} from '../../../utils/pickTeamPerformanceOverallScore'

interface UseTeamMemberPerformanceScoresResult {
  scoreByEmployeeId: Map<string, number | null>

  loading: boolean

  error: string | null

  performanceCyclesQueryError: string | null

  refetch: () => Promise<void>
}

function serializeEmployeeIds(ids: string[]): string {
  return [...new Set(ids)].sort().join('\u0001')
}

export function useTeamMemberPerformanceScores(
  accessToken: string | undefined,
  employeeIds: string[]
): UseTeamMemberPerformanceScoresResult {
  const graphqlClient = useGraphQLClient(accessToken ?? '')

  const [completedCycleIds, setCompletedCycleIds] = useState<Set<string>>(() => new Set())

  const [cyclesLoaded, setCyclesLoaded] = useState(false)

  const [performanceCyclesQueryError, setPerformanceCyclesQueryError] = useState<string | null>(null)

  const [scoreByEmployeeId, setScoreByEmployeeId] = useState<Map<string, number | null>>(() => new Map())

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const idsSerialized = useMemo(() => serializeEmployeeIds(employeeIds), [employeeIds])

  const stableIds = useMemo(() => (idsSerialized ? idsSerialized.split('\u0001') : []), [idsSerialized])

  useEffect(() => {
    if (!accessToken) {
      setCompletedCycleIds(new Set())

      setCyclesLoaded(false)

      setPerformanceCyclesQueryError(null)

      setScoreByEmployeeId(new Map())

      setLoading(false)

      setError(null)

      return
    }

    let cancelled = false

    setCyclesLoaded(false)

    setPerformanceCyclesQueryError(null)

    graphqlClient

      .request<GetPerformanceCyclesResponse>(GET_PERFORMANCE_CYCLES)

      .then(result => {
        if (cancelled) return

        const rows = result.PerformanceCycle ?? []

        setCompletedCycleIds(buildCompletedPerformanceCycleIdSet(rows))

        setPerformanceCyclesQueryError(null)

        setCyclesLoaded(true)
      })

      .catch(err => {
        if (cancelled) return

        console.error('Performance cycles load failed:', err)

        setCompletedCycleIds(new Set())

        setPerformanceCyclesQueryError(err instanceof Error ? err.message : 'Performance cycles query failed')

        setCyclesLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient])

  const loadScores = useCallback(async () => {
    if (!accessToken || !cyclesLoaded) {
      return
    }

    const ids = stableIds.filter(Boolean)

    if (ids.length === 0) {
      setScoreByEmployeeId(new Map())

      setLoading(false)

      setError(null)

      return
    }

    setLoading(true)

    setError(null)

    try {
      const resolved = await Promise.all(
        ids.map(employeeId => resolveTeamPerformanceScore(accessToken, employeeId, completedCycleIds))
      )

      const nextScores = new Map<string, number | null>()

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]

        nextScores.set(id, resolved[i].score)
      }

      setScoreByEmployeeId(nextScores)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load performance scores'

      setError(message)

      setScoreByEmployeeId(new Map())
    } finally {
      setLoading(false)
    }
  }, [accessToken, cyclesLoaded, completedCycleIds, stableIds])

  useEffect(() => {
    void loadScores()
  }, [loadScores])

  return {
    scoreByEmployeeId,

    loading,

    error,

    performanceCyclesQueryError,

    refetch: loadScores
  }
}
