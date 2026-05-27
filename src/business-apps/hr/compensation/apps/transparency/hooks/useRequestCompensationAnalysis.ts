import { useCallback, useMemo, useState } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'

import { COMPENSATION_ANALYSIS_BASE_PATH } from '../api/compensationAnalysisRestConfig'
import { requestCompleteCompensationAnalysis } from '../api/requestCompensationAnalysis'
import type { CompleteAnalysisRequestOptions } from '../types/compensationAnalysisRequest.types'

interface UseRequestCompensationAnalysisOptions extends CompleteAnalysisRequestOptions {
  onSuccess?: () => void | Promise<void>
}

export interface UseRequestCompensationAnalysisResult {
  requestCompleteAnalysis: () => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useRequestCompensationAnalysis(
  accessToken: string,
  options: UseRequestCompensationAnalysisOptions = {}
): UseRequestCompensationAnalysisResult {
  const { onSuccess, tenureThresholdYears, minGroupSize, scope, analysisDate, jobLevelId } = options
  const restClient = useRestClient(COMPENSATION_ANALYSIS_BASE_PATH)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestOptions = useMemo(
    (): CompleteAnalysisRequestOptions => ({
      ...(tenureThresholdYears == null ? {} : { tenureThresholdYears }),
      ...(minGroupSize == null ? {} : { minGroupSize }),
      ...(scope ? { scope } : {}),
      ...(analysisDate ? { analysisDate } : {}),
      ...(jobLevelId ? { jobLevelId } : {})
    }),
    [analysisDate, jobLevelId, minGroupSize, scope, tenureThresholdYears]
  )

  const requestCompleteAnalysis = useCallback(async () => {
    if (!accessToken) {
      setError('Access token missing')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await requestCompleteCompensationAnalysis(restClient, accessToken, requestOptions)
      await onSuccess?.()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : String(requestError)
      console.error('Complete compensation analysis request failed:', message)
      setError(message)
      throw requestError
    } finally {
      setLoading(false)
    }
  }, [accessToken, onSuccess, requestOptions, restClient])

  const clearError = useCallback(() => setError(null), [])

  return {
    requestCompleteAnalysis,
    loading,
    error,
    clearError
  }
}
