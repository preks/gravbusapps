import { useState, useEffect } from 'react'
import { useEmployeeCount } from './useEmployeeCount'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'

/**
 * Response type for FTE data query
 */
type DatasetRow = { category: string; value: number }
interface DatasetResponse {
  categories?: string[]
  data?: DatasetRow[]
}

/**
 * Hook to calculate the FTE/Employees ratio
 * @param accessToken Access token for API authentication
 * @returns Object containing ratio, loading state, and error
 */
export function useFteRatio(accessToken: string) {
  const [totalFte, setTotalFte] = useState<number>(0)
  const [ratio, setRatio] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  // Get employee count
  const { count: employeeCount, loading: countLoading, error: countError } = useEmployeeCount(accessToken)

  // Fetch FTE data
  useEffect(() => {
    if (!datasetClient || countLoading) return

    setLoading(true)
    setError(null)

    datasetClient
      .executeQuery('fteDataCurrentEmployees', QueryType.DATASET, {})
      .then(response => {
        const data = (response as unknown as DatasetResponse)?.data || []
        const averageRow = data.find(r => String(r.category).toLowerCase() === 'average_fte')
        const averageFte = typeof averageRow?.value === 'number' ? averageRow.value : 0

        setTotalFte(averageFte)
        setRatio(averageFte)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useFteRatio] Error fetching FTE data:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch FTE data'))
        setLoading(false)
      })
  }, [datasetClient, countLoading])

  // Combine errors
  useEffect(() => {
    if (countError) {
      setError(countError)
    }
  }, [countError])

  return {
    totalFte,
    employeeCount,
    ratio,
    loading: loading || countLoading,
    error
  }
}
