import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

import { fetchActiveStructureCompanies, type StructureCompany } from '../utils/fetchActiveStructureCompanies'

export type { StructureCompany }

/**
 * Fetches legal entities from the active organizational structure.
 * Shared by compensation planning, HR analytics, and employee filters.
 */
export function useActiveStructureCompanies(accessToken: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)
  const [companies, setCompanies] = useState<StructureCompany[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const result = await fetchActiveStructureCompanies(graphqlClient, orgchartClient)

        if (!cancelled) {
          setCompanies(result)
          setError(null)
        }
      } catch (err) {
        console.error('Failed to load companies from active structure:', err)
        if (!cancelled) {
          setCompanies([])
          setError(err instanceof Error ? err.message : 'Failed to load companies')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, orgchartClient])

  return { companies, loading, error }
}
