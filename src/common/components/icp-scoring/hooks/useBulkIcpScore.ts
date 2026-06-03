import { useCallback, useEffect, useRef, useState } from 'react'
import { scoreBulk } from '../api/icpScoringClient'
import {
  bulkIcpScoreRequestSchema,
  type BulkIcpScoreCommandResult,
  type BulkIcpScoreRequest
} from '../types/icpScoringTypes'
import { resolveIcpScoringErrorMessage } from '../utils/icpScoringErrorUtils'

export interface UseBulkIcpScoreReturn {
  data: BulkIcpScoreCommandResult | null
  loading: boolean
  error: string | null
  runBulkScore: (request: BulkIcpScoreRequest) => Promise<BulkIcpScoreCommandResult | null>
  reset: () => void
}

export function useBulkIcpScore(
  accessToken: string,
  bulkScoreErrorFallback: string,
  authErrorMessage: string
): UseBulkIcpScoreReturn {
  const [data, setData] = useState<BulkIcpScoreCommandResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    if (!mountedRef.current) {
      return
    }

    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  const runBulkScore = useCallback(
    async (request: BulkIcpScoreRequest): Promise<BulkIcpScoreCommandResult | null> => {
      if (controllerRef.current) {
        return null
      }

      if (!accessToken.trim()) {
        setError(authErrorMessage)
        return null
      }

      const parsedRequest = bulkIcpScoreRequestSchema.parse(request)
      const controller = new AbortController()

      controllerRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const result = await scoreBulk(parsedRequest, accessToken, controller.signal)
        if (mountedRef.current) {
          setData(result)
        }
        return result
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return null
        }

        if (mountedRef.current) {
          setError(resolveIcpScoringErrorMessage(caughtError, bulkScoreErrorFallback, authErrorMessage))
        }
        return null
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }

        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [accessToken, authErrorMessage, bulkScoreErrorFallback]
  )

  return {
    data,
    loading,
    error,
    runBulkScore,
    reset
  }
}

export default useBulkIcpScore
