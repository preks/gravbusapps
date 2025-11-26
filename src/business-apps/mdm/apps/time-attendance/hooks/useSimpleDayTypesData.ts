import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SimpleDayTypeResponse, SimpleDayType } from '../types/day-types'

// GraphQL Query - Simple version for Day Types list
const GET_SIMPLE_DAY_TYPES_QUERY = `
  query GetSimpleDayTypes {
    DayType {
      id
      name
      version
      code
      dayTypeVersion(where: {isDeleted: {_eq: false}}) {
      id
      }
    }
  }
`

// Hook interface
export interface UseSimpleDayTypesDataReturn {
  dayTypes: SimpleDayType[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useSimpleDayTypesData = (context: BusinessAppContextProps): UseSimpleDayTypesDataReturn => {
  const [dayTypes, setDayTypes] = useState<SimpleDayType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformDayTypes = useCallback((rawData: SimpleDayTypeResponse['DayType']): SimpleDayType[] => {
    return rawData.map(item => {
      const dayTypeVersionIds = item.dayTypeVersion.map(version => version.id)
      return {
        id: item.id,
        name: item.name,
        code: item.code,
        version: item.version,
        dayTypeVersion: dayTypeVersionIds
      }
    })
  }, [])

  const fetchDayTypesData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<SimpleDayTypeResponse>(GET_SIMPLE_DAY_TYPES_QUERY, {})
      const transformedData = transformDayTypes(result.DayType || [])
      setDayTypes(transformedData)
    } catch (err) {
      console.error('Error fetching simple day types data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch day types data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformDayTypes])

  const refetch = useCallback(async () => {
    await fetchDayTypesData()
  }, [fetchDayTypesData])

  // Initial fetch
  useEffect(() => {
    fetchDayTypesData()
  }, [fetchDayTypesData])

  return { dayTypes, loading, error, refetch }
}
