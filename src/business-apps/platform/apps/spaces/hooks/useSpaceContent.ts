/**
 * useSpaceContent Hook
 *
 * Hook for managing content operations within a space
 * Fetches content via API and handles content operations
 */

import { useState, useCallback, useEffect } from 'react'
import type { Space, SpaceContentItem, MoveContentInput } from '../types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

export interface UseSpaceContentResult {
  documents: SpaceContentItem[]
  notes: SpaceContentItem[]
  spreadsheets: SpaceContentItem[]
  slides: SpaceContentItem[]
  allContent: SpaceContentItem[]
  isLoading: boolean
  error: string | null
  moveContent: (input: Omit<MoveContentInput, 'targetSpaceId'>) => Promise<boolean>
  removeContent: (entityType: string, entityId: string) => Promise<boolean>
}

/**
 * Hook for managing space content
 * @param spaceId - The space ID
 * @param accessToken - The access token for API calls
 * @param space - The space object (used to detect when to refresh)
 * @param onContentChange - Callback to refresh space data after content changes
 */
export function useSpaceContent(
  spaceId: string | null,
  accessToken: string | undefined,
  space: Space | null,
  onContentChange?: () => void
): UseSpaceContentResult {
  const [documents, setDocuments] = useState<SpaceContentItem[]>([])
  const [notes, setNotes] = useState<SpaceContentItem[]>([])
  const [spreadsheets, setSpreadsheets] = useState<SpaceContentItem[]>([])
  const [slides, setSlides] = useState<SpaceContentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch content from API
  const fetchContent = useCallback(async () => {
    if (!spaceId || !accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      // Try to fetch from the space content endpoint
      const url = `${API_URL}/spaces/${spaceId}/content`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        // Don't throw, just log - endpoint might not exist yet
        setDocuments([])
        setNotes([])
        setSpreadsheets([])
        setSlides([])
        return
      }

      const data = await response.json()

      // Parse content items
      const docs: SpaceContentItem[] = []
      const notesItems: SpaceContentItem[] = []
      const sheets: SpaceContentItem[] = []
      const slidesItems: SpaceContentItem[] = []

      const items = Array.isArray(data) ? data : []

      for (const item of items) {
        // Map entityType to frontend type
        let type: 'document' | 'note' | 'spreadsheet' | 'slide' = 'document'
        if (item.entityType === 'note') type = 'note'
        else if (item.entityType === 'spreadsheet_app' || item.entityType === 'spreadsheet') type = 'spreadsheet'
        else if (item.entityType === 'slide') type = 'slide'
        else if (item.entityType === 'document') type = 'document'

        const contentItem: SpaceContentItem = {
          id: item.entityId || item.id,
          type,
          title: item.title || item.name || 'Untitled',
          description: item.description,
          updatedAt: item.updatedAt || item.addedAt || new Date().toISOString(),
          createdAt: item.createdAt || item.addedAt || new Date().toISOString(),
          ownerId: item.ownerId || item.addedBy || '',
          spaceId: spaceId
        }

        switch (type) {
          case 'document':
            docs.push(contentItem)
            break
          case 'note':
            notesItems.push(contentItem)
            break
          case 'spreadsheet':
            sheets.push(contentItem)
            break
          case 'slide':
            slidesItems.push(contentItem)
            break
        }
      }

      setDocuments(docs)
      setNotes(notesItems)
      setSpreadsheets(sheets)
      setSlides(slidesItems)
    } catch (err) {
      console.error('[useSpaceContent] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch content')
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, accessToken])

  // Fetch content when spaceId changes or space is updated
  useEffect(() => {
    if (spaceId && accessToken && space) {
      fetchContent()
    }
  }, [spaceId, accessToken, space?.updatedAt, fetchContent])

  // Compute all content sorted by update time
  const allContent = [...documents, ...notes, ...spreadsheets, ...slides].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const moveContent = useCallback(
    async (input: Omit<MoveContentInput, 'targetSpaceId'>): Promise<boolean> => {
      if (!spaceId || !accessToken) {
        setError('Not authenticated')
        return false
      }

      try {
        setIsLoading(true)
        // Map content type to backend entity type
        const entityType =
          input.contentType === 'spreadsheet' ? 'spreadsheet_app' : input.contentType

        const response = await fetch(`${API_URL}/spaces/${spaceId}/content`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entityType,
            entityId: input.entityId
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to move content: ${response.statusText}`)
        }

        // Refresh content and space data
        await fetchContent()
        onContentChange?.()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move content'
        setError(message)
        console.error('[useSpaceContent] Move error:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [spaceId, accessToken, fetchContent, onContentChange]
  )

  const removeContent = useCallback(
    async (entityType: string, entityId: string): Promise<boolean> => {
      if (!spaceId || !accessToken) {
        setError('Not authenticated')
        return false
      }

      try {
        setIsLoading(true)
        // Map content type to backend entity type
        const backendEntityType =
          entityType === 'spreadsheet' ? 'spreadsheet_app' : entityType

        const response = await fetch(`${API_URL}/spaces/${spaceId}/content/${backendEntityType}/${entityId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to remove content: ${response.statusText}`)
        }

        // Refresh content and space data
        await fetchContent()
        onContentChange?.()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove content'
        setError(message)
        console.error('[useSpaceContent] Remove error:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [spaceId, accessToken, fetchContent, onContentChange]
  )

  return {
    documents,
    notes,
    spreadsheets,
    slides,
    allContent,
    isLoading,
    error,
    moveContent,
    removeContent
  }
}
