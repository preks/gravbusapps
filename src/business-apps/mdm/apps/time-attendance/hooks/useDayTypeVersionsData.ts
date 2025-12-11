import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DayTypeVersionResponse, TransformedDayTypeVersion } from '../types/day-type-versions'
import { FieldTypeOption, FieldTypesCatalogResponse } from '../types/day-type-version-details'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

// GraphQL Query for Day Type Versions
const GET_DAY_TYPE_VERSIONS_QUERY = `
  query GetDayTypeVersions {
    DayTypeVersion {
      id
      dayTypeVersionDetail {
        id
        timeValue
        fieldType
        appliedDay
        version
      }
      color
      activeFrom
      activeTo
      version
      activeVersion
      roundingRule {
        id
        name
      }
      incrementType {
        id
        name
      }
      breakType {
        id
        name
      }
      dayType {
        id
        name
        code
      }
    }
  }
`

// GraphQL Query for Field Types Catalog
const GET_FIELD_TYPES_CATALOG_QUERY = `
  query GetFieldTypesCatalog($activeUserLocale: String!) {
    Catalog(where: {identifier: {_eq: "DayDetailFieldType"}}) {
      catalogEntries {
        id
        code
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          value
        }
      }
    }
  }
`

// Hook interface
export interface UseDayTypeVersionsDataReturn {
  dayTypeVersions: TransformedDayTypeVersion[]
  fieldTypeOptions: FieldTypeOption[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useDayTypeVersionsData = (context: BusinessAppContextProps): UseDayTypeVersionsDataReturn => {
  const [dayTypeVersions, setDayTypeVersions] = useState<TransformedDayTypeVersion[]>([])
  const [fieldTypeOptions, setFieldTypeOptions] = useState<FieldTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  // Calculate status based on activeFrom and activeTo dates
  const calculateStatus = useCallback(
    (activeFrom: string | null, activeTo: string | null): 'active' | 'expired' | 'inactive' | 'planned' => {
      // If either date is missing, consider it inactive
      if (!activeFrom || !activeTo) {
        return 'inactive'
      }
      const currentDate = new Date()
      const fromDate = new Date(activeFrom)
      const toDate = new Date(activeTo)

      // If activeFrom is in the future, it's planned
      if (currentDate < fromDate) {
        return 'planned'
      }

      // If current date is within the range, it's active
      if (currentDate >= fromDate && currentDate <= toDate) {
        return 'active'
      }

      // Otherwise, it's expired
      return 'expired'
    },
    []
  )

  // Transform GraphQL data to final format
  const transformDayTypeVersions = useCallback(
    (rawData: DayTypeVersionResponse['DayTypeVersion']): TransformedDayTypeVersion[] => {
      return rawData.map(item => ({
        id: item.id,
        dayTypeVersionDetail: item.dayTypeVersionDetail.map(detail => ({
          id: detail.id,
          timeValue: detail.timeValue,
          fieldType: detail.fieldType,
          appliedDay: detail.appliedDay,
          version: detail.version
        })),
        activeVersion: item.activeVersion,
        color: item.color,
        activeFrom: item.activeFrom,
        activeTo: item.activeTo,
        status: calculateStatus(item.activeFrom, item.activeTo),
        roundingRule: item.roundingRule,
        incrementType: item.incrementType,
        breakType: item.breakType,
        dayType: item.dayType,
        version: item.version
      }))
    },
    [calculateStatus]
  )

  // Transform catalog data to field type options
  const transformFieldTypeOptions = useCallback((rawData: FieldTypesCatalogResponse['Catalog']): FieldTypeOption[] => {
    if (!rawData || rawData.length === 0) return []

    const catalog = rawData[0]
    if (!catalog?.catalogEntries) return []

    return catalog.catalogEntries.map(entry => ({
      code: entry.code,
      value: entry.value,
      displayValue: entry.translations?.[0]?.value || entry.value || ''
    }))
  }, [])

  const fetchFieldTypeOptions = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    try {
      const result = await graphqlClient.request<FieldTypesCatalogResponse>(GET_FIELD_TYPES_CATALOG_QUERY, {
        activeUserLocale
      })
      const transformedOptions = transformFieldTypeOptions(result.Catalog || [])
      setFieldTypeOptions(transformedOptions)
    } catch (err) {
      console.error('Error fetching field type options:', err)
      // Don't set error for field type options as it's not critical
    }
  }, [context.accessToken, activeUserLocale, graphqlClient, transformFieldTypeOptions])

  const fetchDayTypeVersionsData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<DayTypeVersionResponse>(GET_DAY_TYPE_VERSIONS_QUERY, {})
      const transformedData = transformDayTypeVersions(result.DayTypeVersion || [])
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
      setDayTypeVersions(sortedData)
    } catch (err) {
      console.error('Error fetching day type versions data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch day type versions data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformDayTypeVersions])

  const refetch = useCallback(async () => {
    await fetchDayTypeVersionsData()
  }, [fetchDayTypeVersionsData])

  // Initial fetch
  useEffect(() => {
    fetchDayTypeVersionsData()
    fetchFieldTypeOptions()
  }, [fetchDayTypeVersionsData, fetchFieldTypeOptions])

  return { dayTypeVersions, loading, error, refetch, fieldTypeOptions }
}
