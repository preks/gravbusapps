import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export const useGraphQLQuery = (accessToken: string) => {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)

  const execute = useCallback(async () => {
    if (!query.trim() || !accessToken) {
      setError(!query.trim() ? 'Query is required' : 'Access token is required')
      return
    }

    setIsExecuting(true)
    setError(null)
    setResult(null)

    try {
      const response = await graphqlClient.request(query)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query')
      setResult(null)
    } finally {
      setIsExecuting(false)
    }
  }, [query, accessToken, graphqlClient])

  return { query, setQuery, result, error, isExecuting, execute }
}
