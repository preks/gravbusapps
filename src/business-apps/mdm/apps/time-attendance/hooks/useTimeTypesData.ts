import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  TimeTypeEnum,
  TimeTypeResponse,
  SystemTimeTypeResponse,
  TransformedTimeType,
  TransformedSystemTimeType
} from '../types/time-types'

// GraphQL Query
const GET_TIME_TYPES_QUERY = `
  query GetTimeTypes {
    TimeType {
      id
      name
      visible
      type
      code
      version
    }
  }
`

const GET_SYSTEM_TIME_TYPES = `query GetSystemTimeTypes {
  Catalog(where: {identifier: {_eq: "TimeTypes"}}) {
    id
    catalogEntries {
      code
      value
    }
  }
}`

// Hook interface
export interface UseTimeTypesDataReturn {
  timeTypes: TransformedTimeType[]
  systemTimeTypes: TransformedSystemTimeType[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useTimeTypesData = (context: BusinessAppContextProps): UseTimeTypesDataReturn => {
  const [timeTypes, setTimeTypes] = useState<TransformedTimeType[]>([])
  const [systemTimeTypes, setSystemTimeTypes] = useState<TransformedSystemTimeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformTimeTypes = useCallback((rawData: TimeTypeResponse['TimeType']): TransformedTimeType[] => {
    return rawData.map(item => {
      let type: 'System' | 'Custom' | 'Unknown' = 'Unknown'

      if (item.type === TimeTypeEnum.TIME_TYPE_SYSTEM) {
        type = 'System'
      } else if (item.type === TimeTypeEnum.TIME_TYPE_CUSTOM) {
        type = 'Custom'
      }

      return {
        id: item.id,
        name: item.name,
        visible: item.visible,
        type: type,
        code: item.code,
        version: item.version
      }
    })
  }, [])

  // Filter system time types to exclude those with codes that exist in timeTypes
  const filterSystemTimeTypes = useCallback(
    (
      systemTypes: TransformedSystemTimeType[],
      existingTimeTypes: TransformedTimeType[]
    ): TransformedSystemTimeType[] => {
      const existingCodes = new Set(existingTimeTypes.map(item => item.code))
      return systemTypes.filter(systemType => !existingCodes.has(systemType.code))
    },
    []
  )

  const fetchTimeTypesData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const systemResult = await graphqlClient.request<SystemTimeTypeResponse>(GET_SYSTEM_TIME_TYPES, {})
      const timeResult = await graphqlClient.request<TimeTypeResponse>(GET_TIME_TYPES_QUERY, {})
      const transformedTimeData = transformTimeTypes(timeResult.TimeType || [])
      setTimeTypes(transformedTimeData)
      const transformedSystemData = systemResult.Catalog[0].catalogEntries.map(item => ({
        label: item.value,
        value: item.code,
        code: item.code,
        visible: item?.visible ?? true
      }))
      if (transformedTimeData.length > 0) {
        const filteredSystemTypes = filterSystemTimeTypes(transformedSystemData, transformedTimeData)
        setSystemTimeTypes(filteredSystemTypes)
      } else {
        setSystemTimeTypes(transformedSystemData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformTimeTypes])

  const refetch = useCallback(async () => {
    await fetchTimeTypesData()
  }, [fetchTimeTypesData])

  // Initial fetch
  useEffect(() => {
    fetchTimeTypesData()
  }, [fetchTimeTypesData])

  return { systemTimeTypes, timeTypes, loading, error, refetch }
}
