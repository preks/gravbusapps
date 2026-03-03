import { useCallback, useEffect, useState } from 'react'
import { getPerformanceEvaluationAnalysisDetail } from '../services/performanceEvaluationApi'
import {
  PerformanceEvaluationAnalysisDetailResponse,
  PerformanceEvaluationDetailQueryParams
} from '../types/performanceEvaluation.types'

interface UsePerformanceEvaluationDetailParams {
  accessToken: string
  evaluationId: string | null
  query: PerformanceEvaluationDetailQueryParams
}

interface UsePerformanceEvaluationDetailResult {
  data: PerformanceEvaluationAnalysisDetailResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePerformanceEvaluationDetail = ({
  accessToken,
  evaluationId,
  query
}: UsePerformanceEvaluationDetailParams): UsePerformanceEvaluationDetailResult => {
  const [data, setData] = useState<PerformanceEvaluationAnalysisDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!evaluationId) {
      setData(null)
      setError(null)
      return
    }

    if (!accessToken) {
      console.error('Access token missing')
      setData(null)
      setError('Access token missing')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await getPerformanceEvaluationAnalysisDetail(accessToken, evaluationId, query)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load performance evaluation detail'
      setError(errorMessage)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, evaluationId, query])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return {
    data,
    loading,
    error,
    refetch: fetchDetail
  }
}
