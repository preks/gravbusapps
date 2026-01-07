import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BreakType, BreakTypesResponse } from '../types/break-types'

const GET_BREAK_TYPES = `
  query GetBreakTypes {
    BreakType {
      id
      code
      name
      version
    }
  }
`

export const useBreakTypesData = (context: BusinessAppContextProps) => {
  const [breakTypes, setBreakTypes] = useState<BreakType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchBreakTypes = useCallback(async () => {
    if (!context.accessToken) return

    try {
      setLoading(true)
      setError(null)

      const result = await graphqlClient.request<BreakTypesResponse>(GET_BREAK_TYPES)
      setBreakTypes(result.BreakType || [])
    } catch (err) {
      console.error('Error fetching break types:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch break types'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    fetchBreakTypes()
  }, [fetchBreakTypes])

  return {
    breakTypes,
    loading,
    error,
    refetch: fetchBreakTypes
  }
}
