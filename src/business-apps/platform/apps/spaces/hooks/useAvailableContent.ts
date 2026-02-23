/**
 * useAvailableContent Hook
 *
 * Fetches user's OWNED content (documents, notes, spreadsheets)
 * that can be added to a space (must be owned by user, not already in a space)
 *
 * Note: Only content you OWN can be added to a space. Content shared with you
 * by others cannot be moved to a space - you must be the owner.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { SpaceContentItem } from '../types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

// Get user ID from token (JWT decode)
const getUserIdFromToken = (token: string): string | null => {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.sub || decoded.user_id || decoded.userId || null
  } catch {
    return null
  }
}

export interface AvailableContentItem extends SpaceContentItem {
  isOwned: boolean
  isShared: boolean
}

export interface UseAvailableContentResult {
  documents: AvailableContentItem[]
  notes: AvailableContentItem[]
  spreadsheets: AvailableContentItem[]
  isLoading: boolean
  error: string | null
  search: (query: string) => void
  refresh: () => Promise<void>
}

export function useAvailableContent(
  accessToken: string | undefined,
  excludeSpaceId?: string
): UseAvailableContentResult {
  const [documents, setDocuments] = useState<AvailableContentItem[]>([])
  const [notes, setNotes] = useState<AvailableContentItem[]>([])
  const [spreadsheets, setSpreadsheets] = useState<AvailableContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  // Request ID to handle race conditions
  const requestIdRef = useRef(0)

  const fetchContent = useCallback(
    async (query: string = '') => {
      if (!accessToken) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      // Get current user ID to filter only owned content
      const currentUserId = getUserIdFromToken(accessToken)

      // Increment request ID
      const currentRequestId = ++requestIdRef.current

      try {
        setIsLoading(true)
        setError(null)

        // Build search params
        const searchParams = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''

        // Fetch user's owned content with optional search
        const [docsRes, notesRes, sheetsRes] = await Promise.all([
          fetch(`${API_URL}/documents${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`${API_URL}/notes${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`${API_URL}/spreadsheets${searchParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        ])

        // Check if this request is still the latest
        if (currentRequestId !== requestIdRef.current) {
          return // A newer request was made, ignore this result
        }

        const [docsDataRaw, notesDataRaw, sheetsDataRaw] = await Promise.all([
          docsRes.ok ? docsRes.json() : [],
          notesRes.ok ? notesRes.json() : [],
          sheetsRes.ok ? sheetsRes.json() : []
        ])

        // Ensure we have arrays (handle potential paginated responses)
        const docsData = Array.isArray(docsDataRaw) ? docsDataRaw : docsDataRaw?.items || docsDataRaw?.data || []
        const notesData = Array.isArray(notesDataRaw) ? notesDataRaw : notesDataRaw?.items || notesDataRaw?.data || []
        const sheetsData = Array.isArray(sheetsDataRaw)
          ? sheetsDataRaw
          : sheetsDataRaw?.items || sheetsDataRaw?.data || []

        // Filter: only items the user OWNS and not already in a space
        // This is critical - you can only add your own content to a space
        const filterAvailable = (items: any[], type: 'document' | 'note' | 'spreadsheet') =>
          (Array.isArray(items) ? items : [])
            .filter((item: any) => {
              // Exclude items already in a space
              if (item.spaceId) return false
              // Only include items the user owns (double-check client-side)
              if (currentUserId && item.ownerId && item.ownerId !== currentUserId) return false
              return true
            })
            .map((item: any) => ({
              id: item.id,
              title: item.title || item.name || 'Untitled',
              name: item.name || item.title,
              description: item.description,
              type,
              ownerId: item.ownerId,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              isOwned: true,
              isShared: false
            }))

        setDocuments(filterAvailable(docsData, 'document'))
        setNotes(filterAvailable(notesData, 'note'))
        setSpreadsheets(filterAvailable(sheetsData, 'spreadsheet'))
      } catch (err) {
        // Only set error if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          const message = err instanceof Error ? err.message : 'Failed to load content'
          setError(message)
          console.error('[useAvailableContent] Error:', err)
        }
      } finally {
        // Only stop loading if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [accessToken, excludeSpaceId]
  )

  // Search with debounce
  const search = useCallback(
    (query: string) => {
      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Debounce search
      debounceRef.current = setTimeout(() => {
        fetchContent(query)
      }, 300)
    },
    [fetchContent]
  )

  // Refresh without search query
  const refresh = useCallback(async () => {
    await fetchContent('')
  }, [fetchContent])

  // Initial load
  useEffect(() => {
    fetchContent('')
  }, [fetchContent])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    documents,
    notes,
    spreadsheets,
    isLoading,
    error,
    search,
    refresh
  }
}
