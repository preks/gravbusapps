import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

/**
 * Generic hook for executing dataset queries with common error handling and state management
 * Reduces code duplication across multiple dataset query hooks
 *
 * @param accessToken - Access token for API authentication
 * @param queryName - Name of the dataset query to execute
 * @param queryType - Type of query (DATASET or TIMESERIES)
 * @param params - Query parameters (should be memoized in calling hook)
 * @param transformData - Function to transform raw dataset rows to desired format (should be stable)
 * @param errorPrefix - Prefix for error messages (e.g., hook name)
 * @returns Object containing data, loading state, error, and refetch function
 */
export const useDatasetQuery = <T>(
  accessToken: string,
  queryName: string,
  queryType: QueryType,
  params: Record<string, any>,
  transformData: (rows: any[]) => T[],
  errorPrefix: string
) => {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)
  const transformDataRef = useRef(transformData)
  const paramsRef = useRef(params)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  // Store latest transform function and params
  transformDataRef.current = transformData
  paramsRef.current = params

  // Memoize params string for comparison to avoid unnecessary re-renders
  const paramsString = useMemo(() => JSON.stringify(params), [params])

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error(`[${errorPrefix}] No access token provided`))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      const ds = await datasetClient.executeQuery(queryName, queryType, paramsRef.current)

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error(`[${errorPrefix}] Invalid response structure from dataset API`)
      }

      const transformedData = transformDataRef.current(ds.data)

      if (isMounted.current) {
        setData(transformedData)
        setError(null)
      }
    } catch (err) {
      console.error(`[${errorPrefix}] Error fetching data:`, err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(`[${errorPrefix}] Failed to fetch data`))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient, queryName, queryType, paramsString, errorPrefix])

  useEffect(() => {
    isMounted.current = true
    fetchData()

    return () => {
      isMounted.current = false
    }
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch
  }
}
