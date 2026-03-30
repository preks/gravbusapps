import { useMemo, useRef, useEffect } from 'react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { useContentDocuments } from '@/common/data/content/hooks/useContentDocuments'
import { ContentRole } from '@/common/data/content/types/contentEnums'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

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
 * @param contentTypeId - Optional content type filter
 * @param categoryRefs - Optional category filters (can be multiple)
 * @param search - Optional search query
 */
export const useDocumentAreas = (
  accessToken: string,
  contentTypeId?: string | null,
  categoryIds?: string[],
  search?: string
) => {
  const categoryRefsKey = useMemo(() => JSON.stringify(categoryIds || []), [categoryIds])

  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroup: 'DOCUMENT_CONTENT_GROUP',
      contentTypeId: contentTypeId || undefined,
      categoryIds: categoryIds && categoryIds.length > 0 ? categoryIds : undefined,
      search: search || undefined,
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }),
    [contentTypeId, categoryRefsKey, search]
  )

  const queryOptions = useMemo(
    () => ({
      fields: [
        'id',
        'title',
        'preview',
        'contentGroup',
        'contentType',
        'contentEntryCategories',
        'contentDocuments',
        'createdAt',
        'updatedAt'
      ] as const,
      relationLimit: 100
    }),
    []
  )

  // Fetch Content Entries for DOCUMENTS group
  const { entries, isLoading, error, refetch } = useContentEntries(queryParams, accessToken, queryOptions)

  // Map to DocumentArea format with additional metadata
  const areas: DocumentArea[] = useMemo(
    () =>
      entries.map(entry => ({
        ...entry,
        documentCount: entry.contentDocuments?.length || 0,
        totalSize: entry.contentDocuments?.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) || 0,
        categoryCount: entry.contentEntryCategories?.length || 0
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
 * Fetches ALL documents for the content entry to enable proper tree view and folder counts
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

  // Memoize params with stable object reference - fetch ALL documents for the content entry
  const params = useMemo(() => {
    if (!contentEntryId) {
      return { contentEntryId: '' }
    }

    return {
      contentEntryId,
      // Don't filter by parentDocumentId - fetch all documents to enable tree view and counts
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }
  }, [contentEntryId]) // Removed folderId from dependencies - we always fetch all documents

  // Track if params actually changed
  useEffect(() => {
    prevParamsRef.current = paramsKey
  }, [paramsKey])

  // Fetch ALL documents (both folders and files) for the content entry
  const { documents: allDocuments, isLoading, error, refetch } = useContentDocuments(params, accessToken)

  // Filter out results if no contentEntryId (empty state)
  const shouldShowResults = contentEntryId !== null

  // Filter documents to show only current level (root or specific folder)
  // But keep allDocuments available for counting children
  const documents = useMemo(() => {
    if (!shouldShowResults) return []

    // If folderId is null, show only root-level documents (those without a parent)
    if (folderId === null) {
      return allDocuments.filter(doc => !doc.parentDocumentId)
    }

    // Otherwise, show documents that belong to this specific folder
    return allDocuments.filter(doc => doc.parentDocumentId === folderId)
  }, [allDocuments, folderId, shouldShowResults])

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
    allDocuments, // Return all documents for proper tree view and folder counting
    isLoading: shouldShowResults && isLoading,
    error: shouldShowResults ? error : null,
    refetch
  }
}
