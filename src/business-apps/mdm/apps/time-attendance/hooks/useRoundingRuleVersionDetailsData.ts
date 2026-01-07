import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  RoundingRuleVersionDetailResponse,
  TransformedRoundingRuleVersionDetail
} from '../types/rounding-rule-version-details'

// GraphQL Query for Rounding Rule Version Details
const GET_ROUNDING_RULE_VERSION_DETAILS_QUERY = `
  query GetRoundingRuleVersionDetails($roundingRuleVersionId: uuid!) {
    RoundingRuleVersionDetail(where: {isDeleted: {_eq: false}, roundingRuleVersionId: {_eq: $roundingRuleVersionId}}) {
      id
      version
      displayOrder
      clockingType
      roundingType
      startTime
      endTime
      gracePeriod
      roundingValue
      onlyFirstLast
    }
  }
`

// Hook interface
export interface UseRoundingRuleVersionDetailsDataReturn {
  roundingRuleVersionDetails: TransformedRoundingRuleVersionDetail[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseRoundingRuleVersionDetailsDataProps extends BusinessAppContextProps {
  roundingRuleVersionId: string | null
}

export const useRoundingRuleVersionDetailsData = (
  props: UseRoundingRuleVersionDetailsDataProps
): UseRoundingRuleVersionDetailsDataReturn => {
  const [roundingRuleVersionDetails, setRoundingRuleVersionDetails] = useState<TransformedRoundingRuleVersionDetail[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(props.accessToken)

  // Transform GraphQL data to final format
  const transformDetails = useCallback(
    (
      rawData: RoundingRuleVersionDetailResponse['RoundingRuleVersionDetail']
    ): TransformedRoundingRuleVersionDetail[] => {
      return rawData.map(item => ({
        id: item.id,
        version: item.version,
        displayOrder: item.displayOrder,
        clockingType: item.clockingType,
        roundingType: item.roundingType,
        startTime: item.startTime,
        endTime: item.endTime,
        gracePeriod: item.gracePeriod,
        roundingValue: item.roundingValue,
        onlyFirstLast: item.onlyFirstLast
      }))
    },
    []
  )

  const fetchRoundingRuleVersionDetails = useCallback(async () => {
    if (!props.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    // Don't fetch if roundingRuleVersionId is not provided
    if (!props.roundingRuleVersionId) {
      setRoundingRuleVersionDetails([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<RoundingRuleVersionDetailResponse>(
        GET_ROUNDING_RULE_VERSION_DETAILS_QUERY,
        {
          roundingRuleVersionId: props.roundingRuleVersionId
        }
      )
      const transformedData = transformDetails(result.RoundingRuleVersionDetail || [])
      setRoundingRuleVersionDetails(transformedData)
    } catch (err) {
      console.error('Error fetching rounding rule version details data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch rounding rule version details data'))
    } finally {
      setLoading(false)
    }
  }, [props.accessToken, props.roundingRuleVersionId, graphqlClient, transformDetails])

  const refetch = useCallback(async () => {
    await fetchRoundingRuleVersionDetails()
  }, [fetchRoundingRuleVersionDetails])

  // Initial fetch and refetch when roundingRuleVersionId changes
  useEffect(() => {
    fetchRoundingRuleVersionDetails()
  }, [fetchRoundingRuleVersionDetails])

  return { roundingRuleVersionDetails, loading, error, refetch }
}
