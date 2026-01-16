import { useState, useEffect, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

/**
 * Interface for organizational unit probation rate data
 */
export interface OrganizationalUnitProbationRate {
  id: string
  name: string
  totalEmployees: number
  employeesInProbation: number
  probationRate: number // percentage of employees in probation
}

/**
 * Hook to fetch and calculate Probation Rate by Organizational Unit
 * @param accessToken Access token for API authentication
 * @returns Object containing probation rate data by org unit, loading state, and error
 */
export function useProbationRateByOrgUnit(accessToken: string) {
  const [data, setData] = useState<OrganizationalUnitProbationRate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const lastFetchKeyRef = useRef<string>('')
  const staticCache =
    (useProbationRateByOrgUnit as any).__cache ||
    ((useProbationRateByOrgUnit as any).__cache = new Map<string, Promise<any>>())

  // Fetch probation rate data by organizational unit
  useEffect(() => {
    if (!datasetClient) return

    setLoading(true)
    setError(null)

    // Get the current structure ID from windowUtils
    const structureId = getCurrentActiveStructureId() ?? '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'

    if (!structureId) {
      console.warn('[useProbationRateByOrgUnit] No active structure ID found')
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
    console.info('[useProbationRateByOrgUnit] Fetching probation rate data for structure:', structureId)

    let p = staticCache.get(fetchKey)
    if (!p) {
      p = datasetClient
        .executeQuery('probationRateByOrgUnit', QueryType.DATASET, { structureId })
        .then(resp => resp?.data ?? [])
      staticCache.set(fetchKey, p)
    }

    p.then((rows: Array<{ category?: string; value?: number }>) => {
      console.info('[useProbationRateByOrgUnit] Received dataset rows')

      const mapped: OrganizationalUnitProbationRate[] = (rows || []).map(r => {
        const rate = Number(r?.value ?? 0)
        const rounded = Math.round(rate * 10) / 10
        return {
          id: String(r.category ?? ''),
          name: String(r.category ?? ''),
          totalEmployees: 0,
          employeesInProbation: 0,
          probationRate: rounded
        }
      })

      // Sort by probation rate in descending order
      const sortedData = mapped.sort((a, b) => b.probationRate - a.probationRate)

      setData(sortedData)
      setLoading(false)
    }).catch((err: unknown) => {
      console.error('[useProbationRateByOrgUnit] Error fetching probation rate data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch probation rate data'))
      setLoading(false)
    })
  }, [accessToken, datasetClient])

  return {
    data,
    loading,
    error
  }
}
