import { useCallback, useEffect, useState } from 'react'
import { getEmployeePerformanceEvaluationsAnalysis } from '../services/performanceEvaluationApi'
import { mapPerformanceEvaluationsOverview } from '../utils/performanceEvaluationMappers'
import { EmployeePerformanceEvaluationsOverview } from '../types/performanceEvaluation.types'

interface UseEmployeePerformanceEvaluationsParams {
  accessToken: string
  employeeId?: string
}

interface UseEmployeePerformanceEvaluationsResult {
  data: EmployeePerformanceEvaluationsOverview | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useEmployeePerformanceEvaluations = ({
  accessToken,
  employeeId
}: UseEmployeePerformanceEvaluationsParams): UseEmployeePerformanceEvaluationsResult => {
  const [data, setData] = useState<EmployeePerformanceEvaluationsOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPerformanceEvaluations = useCallback(async () => {
    if (!accessToken) {
      console.error('Access token missing')
      setError('Access token missing')
      setData(null)
      return
    }

    if (!employeeId) {
      setData(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await getEmployeePerformanceEvaluationsAnalysis(accessToken, employeeId)
      setData(mapPerformanceEvaluationsOverview(response))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load performance evaluations'
      setError(errorMessage)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId])

  useEffect(() => {
    fetchPerformanceEvaluations()
  }, [fetchPerformanceEvaluations])

  return {
    data,
    loading,
    error,
    refetch: fetchPerformanceEvaluations
  }
}
