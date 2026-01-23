import { useState, useEffect, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

/**
 * Interface for organizational unit gap rate data
 */
export interface OrganizationalUnitGapRate {
  id: string
  name: string
  totalPositions: number
  vacantPositions: number
  gapRate: number // percentage of vacant positions
}

/**
 * Hook to fetch and calculate Gap Rate by Organizational Unit
 * @param accessToken Access token for API authentication
 * @returns Object containing gap rate data by org unit, loading state, and error
 */
export function useGapRateByOrgUnit(accessToken: string) {
  const [data, setData] = useState<OrganizationalUnitGapRate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const lastFetchKeyRef = useRef<string>('')
  const staticCache =
    (useGapRateByOrgUnit as any).__cache || ((useGapRateByOrgUnit as any).__cache = new Map<string, Promise<any>>())

  // Fetch gap rate data by organizational unit
  useEffect(() => {
    if (!datasetClient) return

    setLoading(true)
    setError(null)

    // Get the current structure ID from windowUtils
    const structureId = getCurrentActiveStructureId()

    if (!structureId) {
      console.warn('[useGapRateByOrgUnit] No active structure ID found')
      setError(new Error('No active structure ID found'))
      setLoading(false)
      return
    }

    // Build dedupe key and guard
    const fetchKey = `${accessToken}|${structureId}`
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey

    // Log request
    console.info('[useGapRateByOrgUnit] Fetching gap rate data for structure:', structureId)

    let p = staticCache.get(fetchKey)
    if (!p) {
      p = datasetClient
        .executeQuery('gapRateByOrgUnit', QueryType.DATASET, { structureId })
        .then(resp => resp?.data ?? [])
      staticCache.set(fetchKey, p)
    }

    p.then((rows: Array<{ category?: string; value?: number }>) => {
      const mapped: OrganizationalUnitGapRate[] = (rows || []).map(r => ({
        id: String(r.category ?? ''),
        name: String(r.category ?? ''),
        totalPositions: 0,
        vacantPositions: 0,
        gapRate: Math.round(Number(r?.value ?? 0) * 10) / 10
      }))
      // Sort by gap rate in descending order
      mapped.sort((a, b) => b.gapRate - a.gapRate)

      setData(mapped)
      setLoading(false)
    }).catch((err: unknown) => {
      console.error('[useGapRateByOrgUnit] Error fetching gap rate data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch gap rate data'))
      setLoading(false)
    })
  }, [accessToken, datasetClient])

  return {
    data,
    loading,
    error
  }
}
