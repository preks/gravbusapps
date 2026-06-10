import { useCallback, useEffect, useRef, useState } from 'react'
import { scoreEntity } from '../api/icpScoringClient'
import { icpScoreRequestSchema, type IcpScoreCommandResult, type IcpScoreRequest } from '../types/icpScoringTypes'
import { resolveIcpScoringErrorMessage } from '../utils/icpScoringErrorUtils'

export interface UseIcpScoreReturn {
  data: IcpScoreCommandResult | null
  loading: boolean
  error: string | null
  runScore: (request: IcpScoreRequest) => Promise<IcpScoreCommandResult | null>
  reset: () => void
}

export function useIcpScore(
  accessToken: string,
  scoreErrorFallback: string,
  authErrorMessage: string
): UseIcpScoreReturn {
  const [data, setData] = useState<IcpScoreCommandResult | null>(null)
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
    async (request: IcpScoreRequest): Promise<IcpScoreCommandResult | null> => {
      if (controllerRef.current) {
        return null
      }

      if (!accessToken.trim()) {
        setError(authErrorMessage)
        return null
      }

      const parsedRequest = icpScoreRequestSchema.parse(request)
      const controller = new AbortController()

      controllerRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const result = await scoreEntity(parsedRequest, accessToken, controller.signal)
        if (mountedRef.current) {
          setData(result)
        }
        return result
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return null
        }

        if (mountedRef.current) {
          setError(resolveIcpScoringErrorMessage(caughtError, scoreErrorFallback, authErrorMessage))
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
    [accessToken, authErrorMessage, scoreErrorFallback]
  )

  return {
    data,
    loading,
    error,
    runScore,
    reset
  }
}

export default useIcpScore
