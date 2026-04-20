/**
 * useSpaces Hook
 *
 * Hook for fetching and managing the list of spaces
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { Space, CreateSpaceInput, UpdateSpaceInput, SpaceMemberRole } from '../types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import translations from '../_i18n'

const API_URL = getDocumentServiceApiUrl()

export interface UseSpacesOptions {
  includeMembers?: boolean
  includeContent?: boolean
  ownedOnly?: boolean
  sharedOnly?: boolean
  autoLoad?: boolean
}

export interface UseSpacesResult {
  spaces: Space[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  createSpace: (input: CreateSpaceInput) => Promise<Space | null>
  updateSpace: (id: string, input: UpdateSpaceInput) => Promise<Space | null>
  deleteSpace: (id: string) => Promise<boolean>
}

export function useSpaces(accessToken: string | undefined, options: UseSpacesOptions = {}): UseSpacesResult {
  const { t } = useTranslation(translations)
  const { includeMembers = true, includeContent = true, autoLoad = true } = options
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setError(t('error-not-authenticated'))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (includeMembers) params.set('includeMembers', 'true')
      if (includeContent) params.set('includeContent', 'true')
      if (options.ownedOnly) params.set('ownedOnly', 'true')
      if (options.sharedOnly) params.set('sharedOnly', 'true')

      const url = `${API_URL}/spaces?${params.toString()}`
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(t('error-load-spaces'))
      }

      const data = await response.json()
      setSpaces(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error-load-spaces')
      setError(message)
      console.error('[useSpaces] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, includeContent, includeMembers, options.ownedOnly, options.sharedOnly, t])

  const createSpace = useCallback(
    async (input: CreateSpaceInput): Promise<Space | null> => {
      if (!accessToken) {
        setError(t('error-not-authenticated'))
        return null
      }

      try {
        // Prepare the create payload - store dimension info in settings
        const createPayload = {
          name: input.name,
          description: input.description,
          icon: input.icon,
          color: input.color,
          coverImage: input.coverImage,
          isPublic: input.isPublic,
          // Store dimension info in settings if provided
          settings: input.dimension
            ? {
                dimension: {
                  type: input.dimension.type,
                  id: input.dimension.id,
                  name: input.dimension.name
                }
              }
            : undefined
        }

        const response = await fetch(`${API_URL}/spaces`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createPayload)
        })

        if (!response.ok) {
          throw new Error(t('error-create-space'))
        }

        let space = await response.json()

        // If memberIds provided, add them via bulk endpoint
        if (input.memberIds && input.memberIds.length > 0) {
          try {
            const membersPayload = input.memberIds.map(userId => ({
              userId,
              role: 'editor' as SpaceMemberRole
            }))

            const membersResponse = await fetch(`${API_URL}/spaces/${space.id}/members/bulk`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ members: membersPayload })
            })

            if (membersResponse.ok) {
              // Refresh the space to get updated member list
              const refreshResponse = await fetch(`${API_URL}/spaces/${space.id}?includeMembers=true`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              })
              if (refreshResponse.ok) {
                space = await refreshResponse.json()
              }
            }
          } catch (memberErr) {
            // Log but don't fail the whole operation - space was created
            console.error('[useSpaces] Error adding members:', memberErr)
          }
        }

        setSpaces(prev => [space, ...prev])
        return space
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error-create-space')
        setError(message)
        console.error('[useSpaces] Create error:', err)
        return null
      }
    },
    [accessToken, t]
  )

  const updateSpace = useCallback(
    async (id: string, input: UpdateSpaceInput): Promise<Space | null> => {
      if (!accessToken) {
        setError(t('error-not-authenticated'))
        return null
      }

      try {
        const response = await fetch(`${API_URL}/spaces/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          throw new Error(t('error-update-space'))
        }

        const space = await response.json()
        setSpaces(prev => prev.map(s => (s.id === id ? space : s)))
        return space
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error-update-space')
        setError(message)
        console.error('[useSpaces] Update error:', err)
        return null
      }
    },
    [accessToken, t]
  )

  const deleteSpace = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) {
        setError(t('error-not-authenticated'))
        return false
      }

      try {
        const response = await fetch(`${API_URL}/spaces/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error(t('error-delete-space'))
        }

        setSpaces(prev => prev.filter(s => s.id !== id))
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error-delete-space')
        setError(message)
        console.error('[useSpaces] Delete error:', err)
        return false
      }
    },
    [accessToken, t]
  )

  useEffect(() => {
    if (autoLoad && accessToken) {
      refresh()
    }
  }, [autoLoad, accessToken, refresh])

  return {
    spaces,
    isLoading,
    error,
    refresh,
    createSpace,
    updateSpace,
    deleteSpace
  }
}
