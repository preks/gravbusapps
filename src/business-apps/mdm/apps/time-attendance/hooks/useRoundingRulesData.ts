import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { RoundingRule, RoundingRulesResponse } from '../types/rounding-rules'

const GET_ROUNDING_RULES = `
  query GetRoundingRules {
    RoundingRule {
      id
      code
      name
      version
    }
  }
`

export const useRoundingRulesData = (context: BusinessAppContextProps) => {
  const [roundingRules, setRoundingRules] = useState<RoundingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRoundingRules = useCallback(async () => {
    if (!context.accessToken) return

    try {
      setLoading(true)
      setError(null)

      const result = await graphqlClient.request<RoundingRulesResponse>(GET_ROUNDING_RULES)
      setRoundingRules(result.RoundingRule || [])
    } catch (err) {
      console.error('Error fetching rounding rules:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch rounding rules'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    fetchRoundingRules()
  }, [fetchRoundingRules])

  return {
    roundingRules,
    loading,
    error,
    refetch: fetchRoundingRules
  }
}
