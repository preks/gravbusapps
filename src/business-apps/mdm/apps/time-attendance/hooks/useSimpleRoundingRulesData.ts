import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SimpleRoundingRuleResponse, SimpleRoundingRule } from '../types/rounding-rules'

// GraphQL Query - Simple version for Rounding Rules list
const GET_SIMPLE_ROUNDING_RULES_QUERY = `
  query GetSimpleRoundingRules {
    RoundingRule {
      id
      name
      version
      code
      roundingRuleVersion(where: {isDeleted: {_eq: false}}) {
        id
      }
    }
  }
`

// Hook interface
export interface UseSimpleRoundingRulesDataReturn {
  roundingRules: SimpleRoundingRule[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useSimpleRoundingRulesData = (context: BusinessAppContextProps): UseSimpleRoundingRulesDataReturn => {
  const [roundingRules, setRoundingRules] = useState<SimpleRoundingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Transform GraphQL data to final format
  const transformRoundingRules = useCallback(
    (rawData: SimpleRoundingRuleResponse['RoundingRule']): SimpleRoundingRule[] => {
      return rawData.map(item => {
        const roundingRuleVersionIds = item.roundingRuleVersion.map(version => version.id)
        return {
          id: item.id,
          name: item.name,
          code: item.code,
          version: item.version,
          roundingRuleVersion: roundingRuleVersionIds
        }
      })
    },
    []
  )

  const fetchRoundingRulesData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<SimpleRoundingRuleResponse>(GET_SIMPLE_ROUNDING_RULES_QUERY, {})
      const transformedData = transformRoundingRules(result.RoundingRule || [])
      setRoundingRules(transformedData)
    } catch (err) {
      console.error('Error fetching simple rounding rules data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch rounding rules data'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient, transformRoundingRules])

  const refetch = useCallback(async () => {
    await fetchRoundingRulesData()
  }, [fetchRoundingRulesData])

  // Initial fetch
  useEffect(() => {
    fetchRoundingRulesData()
  }, [fetchRoundingRulesData])

  return { roundingRules, loading, error, refetch }
}
