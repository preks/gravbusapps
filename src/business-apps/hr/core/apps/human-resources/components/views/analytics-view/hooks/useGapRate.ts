import { useState, useEffect } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

/**
 * Hook to calculate the Gap Rate - percentage of job positions without assigned employees
 * @param accessToken Access token for API authentication
 * @returns Object containing gap rate, vacant positions count, total positions count, loading state, and error
 */
export function useGapRate(accessToken: string) {
  const [gapRate, setGapRate] = useState<number>(0)
  const [vacantPositions, setVacantPositions] = useState<number>(0)
  const [totalPositions, setTotalPositions] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  // Fetch job position data
  useEffect(() => {
    if (!datasetClient) return

    setLoading(true)
    setError(null)

    // Get the current structure ID from windowUtils
    const structureId = getCurrentActiveStructureId()

    if (!structureId) {
      console.warn('[useGapRate] No active structure ID found')
      setError(new Error('No active structure ID found'))
      setLoading(false)
      return
    }

    // Log request
    console.info('[useGapRate] Fetching job position data for structure:', structureId)

    datasetClient
      .executeQuery('jobPositionData', QueryType.DATASET, { structureId })
      .then(result => {
        const rows = Array.isArray(result?.data) ? result.data : []

        const totalRow = rows.find((r: any) => String(r.category).trim().toLowerCase() === 'total job positions')
        const vacantRow = rows.find((r: any) => String(r.category).trim().toLowerCase() === 'vacant job positions')

        const total = Number(totalRow?.value ?? 0)
        const vacant = Number(vacantRow?.value ?? 0)

        const calculatedGapRate = total > 0 ? (vacant / total) * 100 : 0
        const roundedGapRate = Math.round(calculatedGapRate * 10) / 10

        setTotalPositions(total)
        setVacantPositions(vacant)
        setGapRate(roundedGapRate)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useGapRate] Error fetching job position data (dataset):', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch job position data'))
        setLoading(false)
      })
  }, [datasetClient])

  return {
    gapRate,
    vacantPositions,
    totalPositions,
    loading,
    error
  }
}
