import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IncrementTypeVersionResponse, TransformedIncrementTypeVersion } from '../types/increment-type-versions'
import { calculateVersionStatus } from '../utils/calculateVersionStatus'

// GraphQL Query for Increment Type Versions
const GET_INCREMENT_TYPE_VERSIONS_QUERY = `
  query GetIncrementTypeVersions {
    IncrementTypeVersion {
      id
      activeFrom
      activeTo
      version
      activeVersion
      incrementType {
        id
        name
        code
      }
      incrementTypeVersionDetailAggregate {
        aggregate {
          count
        }
      }
    }
  }
`

// Hook interface
export interface UseIncrementTypeVersionsDataReturn {
  incrementTypeVersions: TransformedIncrementTypeVersion[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useIncrementTypeVersionsData = (context: BusinessAppContextProps): UseIncrementTypeVersionsDataReturn => {
  const [incrementTypeVersions, setIncrementTypeVersions] = useState<TransformedIncrementTypeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformIncrementTypeVersions = useCallback(
    (rawData: IncrementTypeVersionResponse['IncrementTypeVersion']): TransformedIncrementTypeVersion[] => {
      return rawData.map(item => ({
        id: item.id,
        increments: item.incrementTypeVersionDetailAggregate.aggregate.count,
        activeVersion: item.activeVersion,
        activeFrom: item.activeFrom,
        activeTo: item.activeTo,
        status: calculateVersionStatus(item.activeFrom, item.activeTo),
        incrementType: item.incrementType,
        version: item.version
      }))
    },
    []
  )

  const fetchIncrementTypeVersionsData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<IncrementTypeVersionResponse>(GET_INCREMENT_TYPE_VERSIONS_QUERY, {})
      const transformedData = transformIncrementTypeVersions(result.IncrementTypeVersion || [])
      // Sort by status: active first, then planned, then expired, then inactive
      const sortedData = [...transformedData].sort((a, b) => {
        // Active comes first
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        // Planned comes after active
        if (a.status === 'planned' && b.status !== 'active' && b.status !== 'planned') return -1
        if (a.status !== 'active' && a.status !== 'planned' && b.status === 'planned') return 1
        // Expired comes after planned
        if (a.status === 'expired' && b.status === 'inactive') return -1
        if (a.status === 'inactive' && b.status === 'expired') return 1
        // Same status, maintain original order
        return 0
      })
      setIncrementTypeVersions(sortedData)
    } catch (err) {
      console.error('Error fetching increment type versions data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch increment type versions data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformIncrementTypeVersions])

  const refetch = useCallback(async () => {
    await fetchIncrementTypeVersionsData()
  }, [fetchIncrementTypeVersionsData])

  // Initial fetch
  useEffect(() => {
    fetchIncrementTypeVersionsData()
  }, [fetchIncrementTypeVersionsData])

  return { incrementTypeVersions, loading, error, refetch }
}
