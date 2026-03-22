/**
 * useSpace Hook
 *
 * Hook for fetching and managing a single space
 */

import { useState, useCallback, useEffect } from 'react'
import type { Space, SpaceMember, AddMemberInput, UpdateSpaceInput } from '../types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

export interface UseSpaceResult {
  space: Space | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateSpace: (input: UpdateSpaceInput) => Promise<Space | null>
  addMember: (input: AddMemberInput) => Promise<SpaceMember | null>
  updateMember: (userId: string, role: string) => Promise<SpaceMember | null>
  removeMember: (userId: string) => Promise<boolean>
  deleteSpace: () => Promise<boolean>
}

export function useSpace(
  spaceId: string | null,
  accessToken: string | undefined,
  includeContent = true
): UseSpaceResult {
  const [space, setSpace] = useState<Space | null>(null)
  const [isLoading, setIsLoading] = useState(!!spaceId)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!spaceId) return

    if (!accessToken) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = includeContent ? '?includeContent=true' : ''
      const url = `${API_URL}/spaces/${spaceId}${params}`
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch space: ${response.statusText}`)
      }

      const data = await response.json()
      setSpace(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load space'
      setError(message)
      console.error('[useSpace] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, accessToken, includeContent])

  const updateSpace = useCallback(
    async (input: UpdateSpaceInput): Promise<Space | null> => {
      if (!spaceId || !accessToken) {
        setError('Not authenticated')
        return null
      }

      try {
        const response = await fetch(`${API_URL}/spaces/${spaceId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          throw new Error(`Failed to update space: ${response.statusText}`)
        }

        const updatedSpace = await response.json()
        setSpace(updatedSpace)
        return updatedSpace
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update space'
        setError(message)
        console.error('[useSpace] Update error:', err)
        return null
      }
    },
    [spaceId, accessToken]
  )

  const addMember = useCallback(
    async (input: AddMemberInput): Promise<SpaceMember | null> => {
      if (!spaceId || !accessToken) {
        setError('Not authenticated')
        return null
      }

      try {
        const response = await fetch(`${API_URL}/spaces/${spaceId}/members`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          throw new Error(`Failed to add member: ${response.statusText}`)
        }

        const member = await response.json()
        // Refresh to get updated member list
        await refresh()
        return member
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add member'
        setError(message)
        console.error('[useSpace] Add member error:', err)
        return null
      }
    },
    [spaceId, accessToken, refresh]
  )

  const updateMember = useCallback(
    async (userId: string, role: string): Promise<SpaceMember | null> => {
      if (!spaceId || !accessToken) {
        setError('Not authenticated')
        return null
      }

      try {
        const response = await fetch(`${API_URL}/spaces/${spaceId}/members/${userId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role })
        })

        if (!response.ok) {
          throw new Error(`Failed to update member: ${response.statusText}`)
        }

        const member = await response.json()
        // Refresh to get updated member list
        await refresh()
        return member
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update member'
        setError(message)
        console.error('[useSpace] Update member error:', err)
        return null
      }
    },
    [spaceId, accessToken, refresh]
  )

  const removeMember = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!spaceId || !accessToken) {
        setError('Not authenticated')
        return false
      }

      try {
        const response = await fetch(`${API_URL}/spaces/${spaceId}/members/${userId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to remove member: ${response.statusText}`)
        }

        // Refresh to get updated member list
        await refresh()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member'
        setError(message)
        console.error('[useSpace] Remove member error:', err)
        return false
      }
    },
    [spaceId, accessToken, refresh]
  )

  const deleteSpace = useCallback(async (): Promise<boolean> => {
    if (!spaceId || !accessToken) {
      setError('Not authenticated')
      return false
    }

    try {
      setError(null)
      const response = await fetch(`${API_URL}/spaces/${spaceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg = typeof body?.message === 'string' ? body.message : `Failed to delete space (${response.status})`
        throw new Error(msg)
      }

      setSpace(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete space'
      setError(message)
      console.error('[useSpace] Delete space error:', err)
      return false
    }
  }, [spaceId, accessToken])

  useEffect(() => {
    if (spaceId && accessToken) {
      refresh()
    }
  }, [spaceId, accessToken, refresh])

  return {
    space,
    isLoading,
    error,
    refresh,
    updateSpace,
    addMember,
    updateMember,
    removeMember,
    deleteSpace
  }
}
