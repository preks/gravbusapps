import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT } from '@/common/data/content/queries/fragments/contentFragments'

/**
 * Hook to fetch all descendants (comments and replies) recursively for a content entry
 */
export const useContentDescendants = (
  rootContentEntryId: string | undefined,
  accessToken?: string
): {
  descendants: ContentEntry[]
  isLoading: boolean
  error: Error | null
} => {
  const [descendants, setDescendants] = useState<ContentEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAllDescendants = useCallback(
    async (parentId: string, allDescendants: ContentEntry[] = []): Promise<ContentEntry[]> => {
      const query = `
        query getChildContentEntries($parentId: uuid!) {
          ContentEntry(
            where: { 
              parentContentEntryId: { _eq: $parentId }
              isDeleted: { _eq: false }
            }
            orderBy: { createdAt: ASC }
            limit: 1000
          ) {
            ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
            contentEntryReactionCounts {
              contentReactionRef
              count
              contentReaction {
                id
                code
                value
              }
            }
            parentContentEntryId
          }
        }
      `

      try {
        const response = await graphqlClient.request<{ ContentEntry: ContentEntry[] }>(query, {
          parentId
        })

        const children = response.ContentEntry || []
        allDescendants.push(...children)

        // Recursively fetch descendants of each child IN PARALLEL
        const childFetches = children
          .filter((child): child is ContentEntry & { id: string } => !!child.id)
          .map(child => fetchAllDescendants(child.id, []))

        const nestedResults = await Promise.all(childFetches)
        nestedResults.forEach(nested => allDescendants.push(...nested))

        return allDescendants
      } catch (err) {
        console.error('[useContentDescendants] Error fetching descendants:', err)
        throw err
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (!rootContentEntryId || !accessToken) {
      setDescendants([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    fetchAllDescendants(rootContentEntryId)
      .then(allDescendants => {
        setDescendants(allDescendants)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error('Failed to fetch descendants'))
        setIsLoading(false)
      })
  }, [rootContentEntryId, accessToken, fetchAllDescendants])

  return {
    descendants,
    isLoading,
    error
  }
}
