import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SimpleIncrementTypeResponse, SimpleIncrementType } from '../types/increment-types'

// GraphQL Query - Simple version for Increment Types list
const GET_SIMPLE_INCREMENT_TYPES_QUERY = `
  query GetSimpleIncrementTypes {
    IncrementType {
      id
      name
      version
      code
      incrementTypeVersion(where: {isDeleted: {_eq: false}}) {
        id
      }
    }
  }
`

// Hook interface
export interface UseSimpleIncrementTypesDataReturn {
  incrementTypes: SimpleIncrementType[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useSimpleIncrementTypesData = (context: BusinessAppContextProps): UseSimpleIncrementTypesDataReturn => {
  const [incrementTypes, setIncrementTypes] = useState<SimpleIncrementType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformIncrementTypes = useCallback(
    (rawData: SimpleIncrementTypeResponse['IncrementType']): SimpleIncrementType[] => {
      return rawData.map(item => {
        const incrementTypeVersionIds = item.incrementTypeVersion.map(version => version.id)
        return {
          id: item.id,
          name: item.name,
          code: item.code,
          version: item.version,
          incrementTypeVersion: incrementTypeVersionIds
        }
      })
    },
    []
  )

  const fetchIncrementTypesData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<SimpleIncrementTypeResponse>(GET_SIMPLE_INCREMENT_TYPES_QUERY, {})
      const transformedData = transformIncrementTypes(result.IncrementType || [])
      setIncrementTypes(transformedData)
    } catch (err) {
      console.error('Error fetching simple increment types data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch increment types data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformIncrementTypes])

  const refetch = useCallback(async () => {
    await fetchIncrementTypesData()
  }, [fetchIncrementTypesData])

  // Initial fetch
  useEffect(() => {
    fetchIncrementTypesData()
  }, [fetchIncrementTypesData])

  return { incrementTypes, loading, error, refetch }
}
