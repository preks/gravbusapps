import { useMemo, useRef, useEffect } from 'react'
import { useContentEntries } from '@/common/data/content'
import { useContentDocuments } from '@/common/data/content/hooks/useContentDocuments'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'

/**
 * Document Area (Content Entry) - Mapped from central hook
 */
export interface DocumentArea extends ContentEntry {
  documentCount: number
  totalSize: number
  categoryCount: number
}

/**
 * Hook to fetch document areas (Content Entries)
 * Uses central useContentEntries hook
 *
 * @param accessToken - Access token for authentication
 * @param contentTypeRef - Optional content type filter
 * @param categoryRefs - Optional category filters (can be multiple)
 */
export const useDocumentAreas = (accessToken: string, contentTypeRef?: string | null, categoryRefs?: string[]) => {
  // Memoize params to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: 'ContentGroup:v1:DOCUMENT',
      contentTypeRef: contentTypeRef || undefined,
      categoryRefs: categoryRefs && categoryRefs.length > 0 ? categoryRefs : undefined,
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }),
    [contentTypeRef, categoryRefs]
  )

  // Fetch Content Entries for DOCUMENTS group
  const { entries, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Map to DocumentArea format with additional metadata
  const areas: DocumentArea[] = useMemo(
    () =>
      entries.map(entry => ({
        ...entry,
        documentCount: entry.contentDocuments?.length || 0,
        totalSize: entry.contentDocuments?.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) || 0,
        categoryCount: entry.contentEntryCategory?.length || 0
      })),
    [entries]
  )

  return {
    areas,
    isLoading,
    error,
    refetch
  }
}

/**
 * Hook to fetch folders and documents for current location
 * Uses central useContentDocuments hook with stability fix
 */
export const useFolderContents = (accessToken: string, contentEntryId: string | null, folderId: string | null) => {
  // Use ref to track previous params to avoid unnecessary re-fetches
  const prevParamsRef = useRef<string>('')

  // Serialize params for stable comparison
  const paramsKey = useMemo(() => {
    if (!contentEntryId) return 'empty'
    return JSON.stringify({
      contentEntryId,
      folderId: folderId || null
    })
  }, [contentEntryId, folderId])

  // Memoize params with stable object reference
  const params = useMemo(() => {
    if (!contentEntryId) {
      return { contentEntryId: '' }
    }

    return {
      contentEntryId,
      parentDocuments: folderId ? [folderId] : undefined,
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }
  }, [paramsKey])

  // Track if params actually changed
  useEffect(() => {
    prevParamsRef.current = paramsKey
  }, [paramsKey])

  // Fetch documents (both folders and files)
  const { documents, isLoading, error, refetch } = useContentDocuments(params, accessToken)

  // Filter out results if no contentEntryId (empty state)
  const shouldShowResults = contentEntryId !== null

  // Split into folders and files only if we have a valid contentEntryId
  const folders = useMemo(
    () => (shouldShowResults ? documents.filter(doc => doc.folder === true) : []),
    [documents, shouldShowResults]
  )
  const files = useMemo(
    () => (shouldShowResults ? documents.filter(doc => doc.folder === false) : []),
    [documents, shouldShowResults]
  )

  return {
    folders,
    documents: files,
    isLoading: shouldShowResults && isLoading,
    error: shouldShowResults ? error : null,
    refetch
  }
}
