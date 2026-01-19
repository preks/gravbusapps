import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BreakTypeVersionResponse, TransformedBreakTypeVersion } from '../types/break-type-versions'
import { calculateVersionStatus } from '../utils/calculateVersionStatus'

// GraphQL Query for Break Type Versions
const GET_BREAK_TYPE_VERSIONS_QUERY = `
  query GetBreakTypeVersions {
    BreakTypeVersion {
      id
      activeFrom
      activeTo
      version
      activeVersion
      minBreakTime
      maxBreakTime
      minWorkTime
      minRemainderTime
      breakType {
        id
        name
        code
      }
      breakTypeVersionDetailAggregate {
        aggregate {
          count
        }
      }
    }
  }
`

// Hook interface
export interface UseBreakTypeVersionsDataReturn {
  breakTypeVersions: TransformedBreakTypeVersion[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useBreakTypeVersionsData = (context: BusinessAppContextProps): UseBreakTypeVersionsDataReturn => {
  const [breakTypeVersions, setBreakTypeVersions] = useState<TransformedBreakTypeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformBreakTypeVersions = useCallback(
    (rawData: BreakTypeVersionResponse['BreakTypeVersion']): TransformedBreakTypeVersion[] => {
      return rawData.map(item => {
        return {
          id: item.id,
          breaks: item.breakTypeVersionDetailAggregate.aggregate.count,
          activeVersion: item.activeVersion,
          activeFrom: item.activeFrom,
          activeTo: item.activeTo,
          version: item.version,
          status: calculateVersionStatus(item.activeFrom, item.activeTo),
          minBreakTime: item.minBreakTime,
          maxBreakTime: item.maxBreakTime,
          minWorkTime: item.minWorkTime,
          minRemainderTime: item.minRemainderTime,
          breakType: item.breakType
        }
      })
    },
    []
  )

  const fetchBreakTypeVersionsData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<BreakTypeVersionResponse>(GET_BREAK_TYPE_VERSIONS_QUERY, {})
      const transformedData = transformBreakTypeVersions(result.BreakTypeVersion || [])

      // Sort by status: active first, then planned, then expired, then inactive
      const sortedData = [...transformedData].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        if (a.status === 'planned' && b.status !== 'active' && b.status !== 'planned') return -1
        if (a.status !== 'active' && a.status !== 'planned' && b.status === 'planned') return 1
        if (a.status === 'expired' && b.status === 'inactive') return -1
        if (a.status === 'inactive' && b.status === 'expired') return 1
        return 0
      })

      setBreakTypeVersions(sortedData)
    } catch (err) {
      console.error('Error fetching break type versions data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch break type versions data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformBreakTypeVersions])

  const refetch = useCallback(async () => {
    await fetchBreakTypeVersionsData()
  }, [fetchBreakTypeVersionsData])

  // Initial fetch
  useEffect(() => {
    fetchBreakTypeVersionsData()
  }, [fetchBreakTypeVersionsData])

  return {
    breakTypeVersions,
    loading,
    error,
    refetch
  }
}
