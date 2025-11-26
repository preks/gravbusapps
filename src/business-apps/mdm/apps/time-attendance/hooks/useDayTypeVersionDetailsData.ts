import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DayTypeVersionDetailResponse, TransformedDayTypeVersionDetail } from '../types/day-type-version-details'

// GraphQL Query for Day Type Version Details
const GET_DAY_TYPE_VERSION_DETAILS_QUERY = `
  query GetDayTypeVersionDetails($dayTypeVersionId: uuid!) {
    DayTypeVersionDetail(where: {isDeleted: {_eq: false}, dayTypeVersionId: {_eq: $dayTypeVersionId}}) {
      id
      version
      timeValue
      fieldType
      appliedDay
    }
  }
`

// Hook interface
export interface UseDayTypeVersionDetailsDataReturn {
  dayTypeVersionDetails: TransformedDayTypeVersionDetail[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseDayTypeVersionDetailsDataProps extends BusinessAppContextProps {
  dayTypeVersionId: string | null
}

export const useDayTypeVersionDetailsData = (
  props: UseDayTypeVersionDetailsDataProps
): UseDayTypeVersionDetailsDataReturn => {
  const [dayTypeVersionDetails, setDayTypeVersionDetails] = useState<TransformedDayTypeVersionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(props.accessToken)

  // Transform GraphQL data to final format
  const transformDetails = useCallback(
    (rawData: DayTypeVersionDetailResponse['DayTypeVersionDetail']): TransformedDayTypeVersionDetail[] => {
      return rawData.map(item => ({
        id: item.id,
        version: item.version,
        timeValue: item.timeValue,
        fieldType: item.fieldType,
        appliedDay: item.appliedDay
      }))
    },
    []
  )

  const fetchDayTypeVersionDetails = useCallback(async () => {
    if (!props.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    // Don't fetch if dayTypeVersionId is not provided
    if (!props.dayTypeVersionId) {
      setDayTypeVersionDetails([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<DayTypeVersionDetailResponse>(GET_DAY_TYPE_VERSION_DETAILS_QUERY, {
        dayTypeVersionId: props.dayTypeVersionId
      })
      const transformedData = transformDetails(result.DayTypeVersionDetail || [])
      setDayTypeVersionDetails(transformedData)
    } catch (err) {
      console.error('Error fetching day type version details data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch day type version details data'))
    } finally {
      setLoading(false)
    }
  }, [props.accessToken, props.dayTypeVersionId, graphqlClient, transformDetails])

  const refetch = useCallback(async () => {
    await fetchDayTypeVersionDetails()
  }, [fetchDayTypeVersionDetails])

  // Initial fetch and refetch when dayTypeVersionId changes
  useEffect(() => {
    fetchDayTypeVersionDetails()
  }, [fetchDayTypeVersionDetails])

  return { dayTypeVersionDetails, loading, error, refetch }
}
