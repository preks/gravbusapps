import { useState, useCallback } from 'react'
import { useContentEntry } from '@/common/data/content'
import { ContentEntryWindowVals } from '../../../apps/content-portal/types/content.types'

export interface UseContentResult {
  isUpdating: boolean
  isMutating: boolean
  item: any | null // Using any for backward compatibility with legacy Content type
  create: (values: ContentEntryWindowVals) => Promise<void>
  error: any
  contentNotFound: boolean
}

/**
 * Hook to fetch and manage a single content entry
 * Migrated to use central useContentEntry hook
 */
export const useContent = (contentId: string, accessToken?: string): UseContentResult => {
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<any>(null)

  // Use central content entry hook - FIXED: correct parameter order
  const { entry, isLoading, error, refetch } = useContentEntry(contentId, {
    includeChildren: true,
    accessToken
  })

  const create = useCallback(
    async (values: ContentEntryWindowVals) => {
      setIsMutating(true)
      setMutationError(null)

      try {
        // TODO: Implement mutation using central hooks
        // This should use a mutation hook from central data layer
        console.log('Create/Update content:', values)
        await refetch()
      } catch (err) {
        setMutationError(err)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [refetch]
  )

  // Map entry to legacy item format for backward compatibility
  const item = entry
    ? {
        articleId: entry.id,
        title: entry.title,
        content: entry.content || '',
        previewText: entry.preview || '',
        contentImage: entry.picture,
        createdAt: entry.createdAt,
        timeToRead: entry.timeToRead,
        allowReaction: entry.allowReaction,
        allowComment: entry.allowComment,
        tags: entry.tags || [],
        tagNames: entry.tags || [],
        authorFullName: entry.creatorName,
        displayAuthor: entry.displayCreator
      }
    : null

  return {
    isUpdating: isLoading,
    isMutating,
    item,
    create,
    error: error || mutationError,
    contentNotFound: !isLoading && !entry && !!contentId
  }
}
