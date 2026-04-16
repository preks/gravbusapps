/**
 * useSpaceFolders Hook
 *
 * Hook for listing and managing folders within a space
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { Space, SpaceFolder, CreateSpaceFolderInput, UpdateSpaceFolderInput } from '../types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import translations from '../_i18n'

const API_URL = getDocumentServiceApiUrl()

export interface UseSpaceFoldersResult {
  folders: SpaceFolder[]
  isSupported: boolean
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  createFolder: (input: CreateSpaceFolderInput) => Promise<SpaceFolder | null>
  updateFolder: (folderId: string, input: UpdateSpaceFolderInput) => Promise<SpaceFolder | null>
  deleteFolder: (folderId: string) => Promise<boolean>
}

export function useSpaceFolders(
  spaceId: string | null,
  accessToken: string | undefined,
  space: Space | null,
  onFoldersChange?: () => void
): UseSpaceFoldersResult {
  const { t } = useTranslation(translations)
  const [folders, setFolders] = useState<SpaceFolder[]>([])
  const [isSupported, setIsSupported] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!spaceId || !accessToken) return
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/spaces/${spaceId}/folders`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (response.status === 404) {
        setIsSupported(false)
        setFolders([])
        setError(t('drive-not-supported'))
        return
      }

      if (!response.ok) {
        throw new Error(t('error-load-folders'))
      }

      const data = await response.json()
      setIsSupported(true)
      setFolders(Array.isArray(data) ? data : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error-load-folders')
      setError(message)
      console.error('[useSpaceFolders] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, spaceId, t])

  const createFolder = useCallback(
    async (input: CreateSpaceFolderInput): Promise<SpaceFolder | null> => {
      if (!spaceId || !accessToken) return null
      if (!isSupported) {
        setError(t('drive-not-supported'))
        return null
      }
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/spaces/${spaceId}/folders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          if (response.status === 404) {
            setIsSupported(false)
          }
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || t('error-create-folder'))
        }

        const created = await response.json()
        await refresh()
        onFoldersChange?.()
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error-create-folder')
        setError(message)
        console.error('[useSpaceFolders] Create error:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, isSupported, onFoldersChange, refresh, spaceId, t]
  )

  const updateFolder = useCallback(
    async (folderId: string, input: UpdateSpaceFolderInput): Promise<SpaceFolder | null> => {
      if (!spaceId || !accessToken) return null
      if (!isSupported) {
        setError(t('drive-not-supported'))
        return null
      }
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/spaces/${spaceId}/folders/${folderId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          if (response.status === 404) {
            setIsSupported(false)
          }
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || t('error-update-folder'))
        }

        const updated = await response.json()
        await refresh()
        onFoldersChange?.()
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error-update-folder')
        setError(message)
        console.error('[useSpaceFolders] Update error:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, isSupported, onFoldersChange, refresh, spaceId, t]
  )

  const deleteFolder = useCallback(
    async (folderId: string): Promise<boolean> => {
      if (!spaceId || !accessToken) return false
      if (!isSupported) {
        setError(t('drive-not-supported'))
        return false
      }
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/spaces/${spaceId}/folders/${folderId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!response.ok) {
          if (response.status === 404) {
            setIsSupported(false)
          }
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || t('error-delete-folder'))
        }

        await refresh()
        onFoldersChange?.()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error-delete-folder')
        setError(message)
        console.error('[useSpaceFolders] Delete error:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, isSupported, onFoldersChange, refresh, spaceId, t]
  )

  useEffect(() => {
    if (spaceId && accessToken && space) {
      refresh()
    }
  }, [spaceId, accessToken, space?.updatedAt, refresh])

  return {
    folders,
    isSupported,
    isLoading,
    error,
    refresh,
    createFolder,
    updateFolder,
    deleteFolder
  }
}
