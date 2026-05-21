import { useState, useEffect } from 'react'
import { useEmployeeCount } from './useEmployeeCount'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

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
  const { selectedCompanyIds } = useHrAnalyticsFilters()
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
    if (countLoading) return

    if (!datasetClient) {
      setError(prev =>
        prev?.message === 'Dataset client is not available' ? prev : new Error('Dataset client is not available')
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    datasetClient
      .executeQuery('fteDataCurrentEmployees', QueryType.DATASET, {
        ...(getCurrentActiveStructureId() ? { structureId: getCurrentActiveStructureId() as string } : {}),
        ...(selectedCompanyIds.length > 0 ? { companyIds: selectedCompanyIds.join(',') } : {})
      })
      .then(response => {
        const data = (response as unknown as DatasetResponse)?.data || []
        const sumRow = data.find(r => String(r.category).toLowerCase() === 'sum_fte')
        const countRow = data.find(r => String(r.category).toLowerCase() === 'employee_count')
        const sumFte = typeof sumRow?.value === 'number' ? sumRow.value : 0
        const datasetCount = typeof countRow?.value === 'number' ? countRow.value : undefined
        const effectiveCount = typeof datasetCount === 'number' ? datasetCount : (employeeCount ?? 0)
        const averageFte = effectiveCount > 0 ? sumFte / effectiveCount : 0

        // totalFte represents the numerator shown in the card (sum of FTEs)
        setTotalFte(sumFte)
        setRatio(averageFte)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useFteRatio] Error fetching FTE data:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch FTE data'))
        setLoading(false)
      })
  }, [datasetClient, countLoading, selectedCompanyIds])

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
