import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IncrementTypeVersionResponse, TransformedIncrementTypeVersion } from '../types/increment-type-versions'

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
      setIncrementTypeVersions(transformedData)
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
