import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CONTENT_TYPES_QUERY } from '../queries/ContentQueries'

export interface SelectOption {
  id: string
  name: string
  parentEntryId?: string
}

interface ContentTypesData {
  ArticleType: { id: string; name: string; parentEntryId?: string }[]
}

export interface UseContentTypesResult {
  typeValues: SelectOption[]
  isLoading: boolean
  error: any
  refetch: () => void
}

/**
 * Mapper to transform content group IDs to display names
 */
const contentGroupDisplayMapper: Record<string, string> = {
  'ArticleGroup:v1:KNOWLEDGE': 'Knowledge',
  'ArticleGroup:v1:NEWS': 'News',
  'ArticleGroup:v1:INTRANET': 'Intranet',
  'ArticleGroup:v1:DOCUMENT': 'Document'
}

export const useContentTypes = (accessToken?: string): UseContentTypesResult => {
  const [typeValues, setTypeValues] = useState<SelectOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTypes = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<ContentTypesData>(GET_CONTENT_TYPES_QUERY)

      const types = result?.ArticleType || []
      const formattedTypes = types.map(type => {
        // Map the parent entry ID to a display name if it exists in the mapper
        const mappedParentId =
          type.parentEntryId && type.parentEntryId in contentGroupDisplayMapper
            ? contentGroupDisplayMapper[type.parentEntryId]
            : type.parentEntryId

        return {
          id: type.id,
          name: type.name,
          parentEntryId: mappedParentId
        }
      })

      setTypeValues(formattedTypes)
    } catch (err) {
      setError(err)
      setTypeValues([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return {
    typeValues,
    isLoading,
    error,
    refetch: fetchTypes
  }
}
