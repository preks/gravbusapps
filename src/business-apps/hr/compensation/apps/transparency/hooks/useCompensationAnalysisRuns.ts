import { useCallback, useEffect, useState } from 'react'

import { useCompensationAnalysisQueries } from '../queries/useCompensationAnalysisQueries'
import type { CompensationAnalysisRun } from '../types/compensationAnalysisRun.types'

interface UseCompensationAnalysisRunsResult {
  runs: CompensationAnalysisRun[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompensationAnalysisRuns(accessToken: string): UseCompensationAnalysisRunsResult {
  const { fetchAnalysisRuns } = useCompensationAnalysisQueries(accessToken)
  const [runs, setRuns] = useState<CompensationAnalysisRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!accessToken) {
      setRuns([])
      setLoading(false)
      setError('Access token missing')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetchAnalysisRuns()
      setRuns(response.CompensationAnalysisRun ?? [])
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
      console.error('Error fetching compensation analysis runs:', message)
      setError(message)
      setRuns([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, fetchAnalysisRuns])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { runs, loading, error, refetch }
}
