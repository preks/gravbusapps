import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { RoundingRuleVersionResponse, TransformedRoundingRuleVersion } from '../types/rounding-rule-versions'
import { calculateVersionStatus } from '../utils/calculateVersionStatus'

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
        status: calculateVersionStatus(item.activeFrom, item.activeTo),
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
      setRoundingRuleVersions(sortedData)
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
