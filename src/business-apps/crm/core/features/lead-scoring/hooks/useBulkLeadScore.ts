import { useCallback, useEffect, useRef, useState } from 'react'
import { scoreBulk } from '../api/leadScoringClient'
import {
  bulkLeadScoreRequestSchema,
  type BulkLeadScoreCommandResult,
  type BulkLeadScoreRequest
} from '../types/leadScoringTypes'
import { resolveLeadScoringErrorMessage } from '../utils/leadScoringErrorUtils'

export interface UseBulkLeadScoreReturn {
  data: BulkLeadScoreCommandResult | null
  loading: boolean
  error: string | null
  runBulkScore: (request: BulkLeadScoreRequest) => Promise<BulkLeadScoreCommandResult | null>
  reset: () => void
}

export function useBulkLeadScore(accessToken: string): UseBulkLeadScoreReturn {
  const [data, setData] = useState<BulkLeadScoreCommandResult | null>(null)
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
    async (request: BulkLeadScoreRequest): Promise<BulkLeadScoreCommandResult | null> => {
      if (controllerRef.current) {
        return null
      }

      if (!accessToken.trim()) {
        setError('Your session expired. Refresh the page and try again.')
        return null
      }

      const parsedRequest = bulkLeadScoreRequestSchema.parse(request)
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
          setError(resolveLeadScoringErrorMessage(caughtError, 'An unknown error occurred while scoring the leads.'))
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
    [accessToken]
  )

  return {
    data,
    loading,
    error,
    runBulkScore,
    reset
  }
}

export default useBulkLeadScore
