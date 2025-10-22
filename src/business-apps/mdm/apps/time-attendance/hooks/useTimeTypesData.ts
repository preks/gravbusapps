import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// GraphQL Query
const GET_TIME_TYPES_QUERY = `
  query GetTimeTypes {
    TimeType {
      id
      name
      visible
      type
      code
      access
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

// Response interface
export interface TimeTypeResponse {
  TimeType: Array<{
    id: string
    name: string
    visible: boolean
    type: string
    code: string
    access: boolean
    version: number
  }>
}

interface SystemTimeTypeResponse {
  Catalog: Array<{
    id: string
    catalogEntries: Array<{
      code: string
      value: string
      visible?: boolean
      access?: boolean
    }>
  }>
}
// Final transformed interface
export interface TransformedTimeType {
  id: string
  name: string
  visible: boolean
  type: 'System' | 'Custom' | 'Unkown'
  code: string
  access: boolean
  version: number
}

export interface TransformedSystemTimeType {
  label: string
  value: string
  code: string
  visible: boolean
  access: boolean
}
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
      let type: 'System' | 'Custom' | 'Unkown' = 'Unkown'

      if (item.type === 'TIME_TYPE_SYSETM') {
        type = 'System'
      } else if (item.type === 'TIME_TYPE_CUSTOM') {
        type = 'Custom'
      }

      return {
        id: item.id,
        name: item.name,
        visible: item.visible,
        type: type,
        code: item.code,
        access: item.access,
        version: item.version
      }
    })
  }, [])

  const fetchSystemTimeTypes = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<SystemTimeTypeResponse>(GET_SYSTEM_TIME_TYPES, {})
      const transformedData = result.Catalog[0].catalogEntries.map(item => ({
        label: item.value,
        value: item.code,
        code: item.code,
        visible: item?.visible ?? true,
        access: item?.access ?? true
      }))
      setSystemTimeTypes(transformedData)
    } catch (err) {
      console.error('Error fetching system time types data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch system time types data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const fetchTimeTypesData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<TimeTypeResponse>(GET_TIME_TYPES_QUERY, {})
      const transformedData = transformTimeTypes(result.TimeType || [])
      setTimeTypes(transformedData)
    } catch (err) {
      console.error('Error fetching time types data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch time types data'))
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
    fetchSystemTimeTypes()
  }, [fetchTimeTypesData, fetchSystemTimeTypes])

  return { systemTimeTypes, timeTypes, loading, error, refetch }
}
