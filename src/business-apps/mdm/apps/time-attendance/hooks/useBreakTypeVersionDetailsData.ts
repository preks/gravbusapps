import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BreakTypeVersionDetailResponse, TransformedBreakTypeVersionDetail } from '../types/break-type-version-details'

// GraphQL Query for Break Type Version Details
const GET_BREAK_TYPE_VERSION_DETAILS_QUERY = `
  query GetBreakTypeVersionDetails($breakTypeVersionId: uuid!) {
    BreakTypeVersionDetail(where: {isDeleted: {_eq: false}, breakTypeVersionId: {_eq: $breakTypeVersionId}}) {
      id
      version
      displayOrder
      type
      startTime
      endTime
      hours
      length
      mandatory
      payOption
      combinedWithBreakTypeVersionDetailId
    }
  }
`

// Hook interface
export interface UseBreakTypeVersionDetailsDataReturn {
  breakTypeVersionDetails: TransformedBreakTypeVersionDetail[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseBreakTypeVersionDetailsDataProps extends BusinessAppContextProps {
  breakTypeVersionId: string | null
}

export const useBreakTypeVersionDetailsData = (
  props: UseBreakTypeVersionDetailsDataProps
): UseBreakTypeVersionDetailsDataReturn => {
  const [breakTypeVersionDetails, setBreakTypeVersionDetails] = useState<TransformedBreakTypeVersionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(props.accessToken)

  // Transform GraphQL data to final format
  const transformDetails = useCallback(
    (rawData: BreakTypeVersionDetailResponse['BreakTypeVersionDetail']): TransformedBreakTypeVersionDetail[] => {
      return rawData
        .map(item => ({
          id: item.id,
          version: item.version,
          displayOrder: item.displayOrder,
          type: item.type,
          startTime: item.startTime,
          endTime: item.endTime,
          hours: item.hours,
          length: item.length,
          mandatory: item.mandatory,
          payOption: item.payOption,
          combinedWithBreakTypeVersionDetailId: item.combinedWithBreakTypeVersionDetailId
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    },
    []
  )

  const fetchBreakTypeVersionDetails = useCallback(async () => {
    if (!props.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    // Don't fetch if breakTypeVersionId is not provided
    if (!props.breakTypeVersionId) {
      setBreakTypeVersionDetails([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<BreakTypeVersionDetailResponse>(GET_BREAK_TYPE_VERSION_DETAILS_QUERY, {
        breakTypeVersionId: props.breakTypeVersionId
      })
      const transformedData = transformDetails(result.BreakTypeVersionDetail || [])
      setBreakTypeVersionDetails(transformedData)
    } catch (err) {
      console.error('Error fetching break type version details data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch break type version details data'))
    } finally {
      setLoading(false)
    }
  }, [props.accessToken, props.breakTypeVersionId, graphqlClient, transformDetails])

  const refetch = useCallback(async () => {
    await fetchBreakTypeVersionDetails()
  }, [fetchBreakTypeVersionDetails])

  // Initial fetch
  useEffect(() => {
    fetchBreakTypeVersionDetails()
  }, [fetchBreakTypeVersionDetails])

  return { breakTypeVersionDetails, loading, error, refetch }
}
