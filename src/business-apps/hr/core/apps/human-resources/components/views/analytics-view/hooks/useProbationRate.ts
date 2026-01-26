import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

/**
 * Response type for Probation Rate data query
 */
type DatasetRow = { category?: string; value?: number }

/**
 * Hook to fetch and calculate probation rate
 * @param accessToken - Access token for API authentication
 * @returns Object containing probationRate, employee counts, loading state, error, and refetch function
 */
export const useProbationRate = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [probationRate, setProbationRate] = useState<number>(0)
  const [employeesInProbation, setEmployeesInProbation] = useState<number>(0)
  const [totalEmployees, setTotalEmployees] = useState<number>(1) // Default to 1 to avoid 0/0 display
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  /**
   * Fetch probation rate data from GraphQL API
   */
  const fetchProbationRate = useCallback(async () => {
    const runIfMounted = (fn: () => void) => {
      if (isMounted.current) fn()
    }

    if (!accessToken) {
      runIfMounted(() => {
        setError(new Error('[useProbationRate] No access token provided'))
        setLoading(false)
      })
      return
    }

    try {
      runIfMounted(() => {
        setLoading(true)
        setError(null)
      })

      // Fetch counts from dataset query 'probationRateData'
      const resp = await datasetClient.executeQuery('probationRateData', QueryType.DATASET, {})
      let rows: DatasetRow[] = []
      if (Array.isArray(resp?.data)) {
        rows = resp.data
      }
      const totalRow = rows.find(r => (r.category || '').toString().toLowerCase() === 'total active employees')
      const probRow = rows.find(r => (r.category || '').toString().toLowerCase() === 'employees in probation')
      const total = Number(totalRow?.value ?? Number.NaN)
      const inProbation = Number(probRow?.value ?? Number.NaN)
      if (Number.isNaN(total)) throw new Error('[useProbationRate] Total employee count is not a valid number')
      if (Number.isNaN(inProbation))
        throw new Error('[useProbationRate] In-probation employee count is not a valid number')

      // Calculate probation rate (percentage of employees currently in probation)
      const calculatedProbationRate = total > 0 ? (inProbation / total) * 100 : 0

      // Round to one decimal place
      const roundedProbationRate = Math.round(calculatedProbationRate * 10) / 10

      // Update state if component is still mounted
      runIfMounted(() => {
        setTotalEmployees(total)
        setEmployeesInProbation(inProbation)
        setProbationRate(roundedProbationRate)
        setError(null)
      })
    } catch (err) {
      console.error('[useProbationRate] Error fetching probation rate:', err)
      runIfMounted(() => {
        setError(err instanceof Error ? err : new Error('[useProbationRate] Failed to fetch probation rate'))
      })
    } finally {
      runIfMounted(() => {
        setLoading(false)
      })
    }
  }, [accessToken, datasetClient])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true

    // Fetch data
    fetchProbationRate()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchProbationRate])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchProbationRate()
  }, [fetchProbationRate])

  return {
    probationRate,
    employeesInProbation,
    totalEmployees,
    loading,
    error,
    refetch
  }
}
