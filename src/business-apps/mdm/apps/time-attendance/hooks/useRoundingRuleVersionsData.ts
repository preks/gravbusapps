import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { RoundingRuleVersionResponse, TransformedRoundingRuleVersion } from '../types/rounding-rule-versions'

// GraphQL Query for Rounding Rule Versions
const GET_ROUNDING_RULE_VERSIONS_QUERY = `
  query GetRoundingRuleVersions {
    RoundingRuleVersion {
      id
      activeFrom
      activeTo
      version
      activeVersion
      roundingRule {
        id
        name
        code
      }
    }
  }
`

// Hook interface
export interface UseRoundingRuleVersionsDataReturn {
  roundingRuleVersions: TransformedRoundingRuleVersion[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useRoundingRuleVersionsData = (context: BusinessAppContextProps): UseRoundingRuleVersionsDataReturn => {
  const [roundingRuleVersions, setRoundingRuleVersions] = useState<TransformedRoundingRuleVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformRoundingRuleVersions = useCallback(
    (rawData: RoundingRuleVersionResponse['RoundingRuleVersion']): TransformedRoundingRuleVersion[] => {
      return rawData.map(item => ({
        id: item.id,
        activeVersion: item.activeVersion,
        activeFrom: item.activeFrom,
        activeTo: item.activeTo,
        roundingRule: item.roundingRule,
        version: item.version
      }))
    },
    []
  )

  const fetchRoundingRuleVersionsData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<RoundingRuleVersionResponse>(GET_ROUNDING_RULE_VERSIONS_QUERY, {})
      const transformedData = transformRoundingRuleVersions(result.RoundingRuleVersion || [])
      setRoundingRuleVersions(transformedData)
    } catch (err) {
      console.error('Error fetching rounding rule versions data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch rounding rule versions data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformRoundingRuleVersions])

  const refetch = useCallback(async () => {
    await fetchRoundingRuleVersionsData()
  }, [fetchRoundingRuleVersionsData])

  // Initial fetch
  useEffect(() => {
    fetchRoundingRuleVersionsData()
  }, [fetchRoundingRuleVersionsData])

  return { roundingRuleVersions, loading, error, refetch }
}
