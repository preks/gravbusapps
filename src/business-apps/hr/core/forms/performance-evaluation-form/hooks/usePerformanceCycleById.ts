import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface PerformanceCycleData {
  id: string
  name: string
  ratingScaleId: string | null
  companyValueIds: string[]
}

const GET_CYCLE_BY_ID = (cycleId: string) => `
  query GetPerformanceCycleById {
    PerformanceCycle(where: { id: { _eq: "${cycleId}" } }, limit: 1) {
      id
      name
      ratingScaleId
      performanceCycleCompanyValue(where: { isDeleted: { _eq: false } }) {
        companyValueId
      }
    }
  }
`

interface PerformanceCycleResponse {
  PerformanceCycle: Array<{
    id: string
    name: string | null
    ratingScaleId: string | null
    performanceCycleCompanyValue: Array<{
      companyValueId: string | null
    }> | null
  }>
}

export interface UsePerformanceCycleByIdProps {
  accessToken: string
  cycleId?: string
}

export const usePerformanceCycleById = ({ accessToken, cycleId }: UsePerformanceCycleByIdProps) => {
  const [cycle, setCycle] = useState<PerformanceCycleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchCycle = useCallback(
    async (targetCycleId: string) => {
      if (!accessToken || !targetCycleId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const query = GET_CYCLE_BY_ID(targetCycleId)
        console.log('[usePerformanceCycleById] Fetching cycle:', targetCycleId)
        const result = await graphqlClient.request<PerformanceCycleResponse>(query)
        console.log('[usePerformanceCycleById] Result:', result)

        if (result.PerformanceCycle && result.PerformanceCycle.length > 0) {
          const apiCycle = result.PerformanceCycle[0]
          const companyValueIds = (apiCycle.performanceCycleCompanyValue ?? [])
            .map(cv => cv.companyValueId)
            .filter((id): id is string => id != null)

          setCycle({
            id: apiCycle.id,
            name: apiCycle.name ?? '',
            ratingScaleId: apiCycle.ratingScaleId,
            companyValueIds
          })
        } else {
          setCycle(null)
          setError('Performance cycle not found')
        }
      } catch (err) {
        console.error('[usePerformanceCycleById] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch performance cycle')
        setCycle(null)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (cycleId) {
      fetchCycle(cycleId)
    } else {
      setCycle(null)
      setLoading(false)
    }
  }, [cycleId, fetchCycle])

  return { cycle, loading, error, fetchCycle }
}
