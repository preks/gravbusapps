import { useCallback, useEffect, useRef, useState } from 'react'
import { scoreLead } from '../api/leadScoringClient'
import { leadScoreRequestSchema, type LeadScoreCommandResult, type LeadScoreRequest } from '../types/leadScoringTypes'
import { resolveLeadScoringErrorMessage } from '../utils/leadScoringErrorUtils'

export interface UseLeadScoreReturn {
  data: LeadScoreCommandResult | null
  loading: boolean
  error: string | null
  runScore: (request: LeadScoreRequest) => Promise<LeadScoreCommandResult | null>
  reset: () => void
}

export function useLeadScore(accessToken: string): UseLeadScoreReturn {
  const [data, setData] = useState<LeadScoreCommandResult | null>(null)
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

  const runScore = useCallback(
    async (request: LeadScoreRequest): Promise<LeadScoreCommandResult | null> => {
      if (controllerRef.current) {
        return null
      }

      if (!accessToken.trim()) {
        setError('Your session expired. Refresh the page and try again.')
        return null
      }

      const parsedRequest = leadScoreRequestSchema.parse(request)
      const controller = new AbortController()

      controllerRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const result = await scoreLead(parsedRequest, accessToken, controller.signal)
        if (mountedRef.current) {
          setData(result)
        }
        return result
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return null
        }

        if (mountedRef.current) {
          setError(resolveLeadScoringErrorMessage(caughtError, 'An unknown error occurred while scoring the lead.'))
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
    runScore,
    reset
  }
}

export default useLeadScore
