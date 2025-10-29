import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// FIXED: Define query inline (old ContentQueries.ts deleted)
const GET_CONTENT_TYPES_QUERY = `
  query GetContentTypes {
    CatalogEntry(
      where: {
        catalog: {
          identifier: { _eq: "ContentType" }
          version: { _eq: "v1" }
        }
        isDeleted: { _neq: true }
      }
      orderBy: { displayOrder: ASC }
    ) {
      id
      code
      value
      parentEntryId
    }
  }
`

export interface SelectOption {
  id: string
  name: string
  parentEntryId?: string
}

interface ContentTypesData {
  CatalogEntry: { id: string; code: string; value: string; parentEntryId?: string }[] // FIXED: Use CatalogEntry
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
  'ContentGroup:v1:KNOWLEDGE': 'Knowledge',
  'ContentGroup:v1:NEWS': 'News',
  'ContentGroup:v1:INTRANET': 'Intranet',
  'ContentGroup:v1:DOCUMENT': 'Document'
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

      const types = result?.CatalogEntry || [] // FIXED: Use CatalogEntry
      const formattedTypes = types.map(entry => {
        // Map the parent entry ID to a display name if it exists in the mapper
        const mappedParentId =
          entry.parentEntryId && entry.parentEntryId in contentGroupDisplayMapper
            ? contentGroupDisplayMapper[entry.parentEntryId]
            : entry.parentEntryId

        return {
          id: entry.id,
          name: entry.value, // FIXED: Use value (display name)
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
