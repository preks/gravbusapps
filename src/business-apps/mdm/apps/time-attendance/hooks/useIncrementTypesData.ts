import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { IncrementType, IncrementTypesResponse } from '../types/increment-types'

const GET_INCREMENT_TYPES = `
  query GetIncrementTypes {
    IncrementType {
      id
      code
      name
      version
    }
  }
`

export const useIncrementTypesData = (context: BusinessAppContextProps) => {
  const [incrementTypes, setIncrementTypes] = useState<IncrementType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchIncrementTypes = useCallback(async () => {
    if (!context.accessToken) return

    try {
      setLoading(true)
      setError(null)

      const result = await graphqlClient.request<IncrementTypesResponse>(GET_INCREMENT_TYPES)
      setIncrementTypes(result.IncrementType || [])
    } catch (err) {
      console.error('Error fetching increment types:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch increment types'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    fetchIncrementTypes()
  }, [fetchIncrementTypes])

  return {
    incrementTypes,
    loading,
    error,
    refetch: fetchIncrementTypes
  }
}
