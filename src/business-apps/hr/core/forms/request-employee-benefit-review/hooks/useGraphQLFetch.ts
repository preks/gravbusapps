import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface UseGraphQLFetchOptions<T> {
  accessToken: string | undefined
  query: string
  variables?: Record<string, any>
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: unknown) => void
}

interface UseGraphQLFetchReturn<T> {
  data: T | null
  isLoading: boolean
  error: unknown
}

/**
 * Generic hook for fetching GraphQL data with automatic cancellation
 * Eliminates code duplication across multiple useEffect patterns
 *
 * @example
 * const { data, isLoading, error } = useGraphQLFetch({
 *   accessToken,
 *   query: GET_EMPLOYEE_NAME,
 *   variables: { employeeId },
 *   enabled: !!employeeId,
 *   onSuccess: (result) => setEmployeeName(result.employee.firstName)
 * })
 */
export function useGraphQLFetch<T = any>({
  accessToken,
  query,
  variables,
  enabled = true,
  onSuccess,
  onError
}: UseGraphQLFetchOptions<T>): UseGraphQLFetchReturn<T> {
  const graphqlClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (!enabled || !accessToken) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<T>(query, variables)
        if (cancelled) return

        setData(result)
        if (onSuccess) {
          onSuccess(result)
        }
      } catch (err) {
        if (cancelled) return

        setError(err)
        if (onError) {
          onError(err)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [accessToken, query, variables, enabled, graphqlClient, onSuccess, onError])

  return { data, isLoading, error }
}
