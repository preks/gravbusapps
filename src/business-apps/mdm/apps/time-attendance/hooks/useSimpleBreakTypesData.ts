import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SimpleBreakTypeResponse, SimpleBreakType } from '../types/break-types'

// GraphQL Query - Simple version for Break Types list
const GET_SIMPLE_BREAK_TYPES_QUERY = `
  query GetSimpleBreakTypes {
    BreakType {
      id
      name
      version
      code
    }
  }
`

// Hook interface
export interface UseSimpleBreakTypesDataReturn {
  breakTypes: SimpleBreakType[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useSimpleBreakTypesData = (context: BusinessAppContextProps): UseSimpleBreakTypesDataReturn => {
  const [breakTypes, setBreakTypes] = useState<SimpleBreakType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformBreakTypes = useCallback((rawData: SimpleBreakTypeResponse['BreakType']): SimpleBreakType[] => {
    return rawData.map(item => {
      return {
        id: item.id,
        name: item.name,
        code: item.code,
        version: item.version
      }
    })
  }, [])

  const fetchBreakTypesData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<SimpleBreakTypeResponse>(GET_SIMPLE_BREAK_TYPES_QUERY, {})
      const transformedData = transformBreakTypes(result.BreakType || [])
      setBreakTypes(transformedData)
    } catch (err) {
      console.error('Error fetching simple break types data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch break types data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformBreakTypes])

  const refetch = useCallback(async () => {
    await fetchBreakTypesData()
  }, [fetchBreakTypesData])

  // Initial fetch
  useEffect(() => {
    fetchBreakTypesData()
  }, [fetchBreakTypesData])

  return { breakTypes, loading, error, refetch }
}
