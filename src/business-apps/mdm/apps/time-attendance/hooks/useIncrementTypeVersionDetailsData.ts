import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  IncrementTypeVersionDetailResponse,
  TransformedIncrementTypeVersionDetail
} from '../types/increment-type-version-details'

// GraphQL Query for Increment Type Version Details
const GET_INCREMENT_TYPE_VERSION_DETAILS_QUERY = `
  query GetIncrementTypeVersionDetails($incrementTypeVersionId: uuid!) {
    IncrementTypeVersionDetail(where: {isDeleted: {_eq: false}, incrementTypeVersionId: {_eq: $incrementTypeVersionId}}) {
      id
      version
      timeIssueType
      displayOrder
      includeBreaks
      fromAppliedDay
      startTime
      toAppliedDate
      endTime
      sumTime
      timeTypeId
      incrementCalculationType
      fixedValue
      includeExcludeOption
      alternativeIncrementTypeVersionDetailId
      checkStartBefore
      startBeforeTime
    }
  }
`

// Hook interface
export interface UseIncrementTypeVersionDetailsDataReturn {
  incrementTypeVersionDetails: TransformedIncrementTypeVersionDetail[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseIncrementTypeVersionDetailsDataProps extends BusinessAppContextProps {
  incrementTypeVersionId: string | null
}

export const useIncrementTypeVersionDetailsData = (
  props: UseIncrementTypeVersionDetailsDataProps
): UseIncrementTypeVersionDetailsDataReturn => {
  const [incrementTypeVersionDetails, setIncrementTypeVersionDetails] = useState<
    TransformedIncrementTypeVersionDetail[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(props.accessToken)

  // Transform GraphQL data to final format
  const transformDetails = useCallback(
    (
      rawData: IncrementTypeVersionDetailResponse['IncrementTypeVersionDetail']
    ): TransformedIncrementTypeVersionDetail[] => {
      return rawData
        .map(item => ({
          id: item.id,
          version: item.version,
          timeIssueType: item.timeIssueType,
          displayOrder: item.displayOrder,
          includeBreaks: item.includeBreaks,
          fromAppliedDay: item.fromAppliedDay,
          startTime: item.startTime,
          toAppliedDate: item.toAppliedDate,
          endTime: item.endTime,
          sumTime: item.sumTime,
          timeTypeId: item.timeTypeId,
          incrementCalculationType: item.incrementCalculationType,
          fixedValue: item.fixedValue,
          includeExcludeOption: item.includeExcludeOption,
          alternativeIncrementTypeVersionDetailId: item.alternativeIncrementTypeVersionDetailId,
          checkStartBefore: item.checkStartBefore ?? false,
          startBeforeTime: item.startBeforeTime ?? null
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    },
    []
  )

  const fetchIncrementTypeVersionDetails = useCallback(async () => {
    if (!props.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    // Don't fetch if incrementTypeVersionId is not provided
    if (!props.incrementTypeVersionId) {
      setIncrementTypeVersionDetails([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<IncrementTypeVersionDetailResponse>(
        GET_INCREMENT_TYPE_VERSION_DETAILS_QUERY,
        {
          incrementTypeVersionId: props.incrementTypeVersionId
        }
      )
      const transformedData = transformDetails(result.IncrementTypeVersionDetail || [])
      setIncrementTypeVersionDetails(transformedData)
    } catch (err) {
      console.error('Error fetching increment type version details data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch increment type version details data'))
    } finally {
      setLoading(false)
    }
  }, [props.accessToken, props.incrementTypeVersionId, graphqlClient, transformDetails])

  const refetch = useCallback(async () => {
    await fetchIncrementTypeVersionDetails()
  }, [fetchIncrementTypeVersionDetails])

  // Initial fetch and refetch when incrementTypeVersionId changes
  useEffect(() => {
    fetchIncrementTypeVersionDetails()
  }, [fetchIncrementTypeVersionDetails])

  return { incrementTypeVersionDetails, loading, error, refetch }
}
