import { useState, useCallback } from 'react'
import { DriveApiService } from '../services/DriveApiService'
import type { DroppedEntry } from './useDriveDropZone'

interface UseDriveUploadOptions {
  accessToken: string | undefined
  currentFolderId: string | null
  onComplete: () => void
  spaceId?: string
}

export interface UploadProgress {
  current: number
  total: number
  currentFileName: string
}

export function useDriveUpload({ accessToken, currentFolderId, onComplete, spaceId }: UseDriveUploadOptions) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !accessToken) return
      DriveApiService.setAccessToken(accessToken)
      setIsUploading(true)
      setProgress({ current: 0, total: files.length, currentFileName: files[0].name })

      try {
        for (let i = 0; i < files.length; i++) {
          setProgress({ current: i, total: files.length, currentFileName: files[i].name })
          await DriveApiService.uploadFile(files[i], currentFolderId ?? undefined, spaceId)
        }
      } finally {
        setIsUploading(false)
        setProgress(null)
        onComplete()
      }
    },
    [accessToken, currentFolderId, onComplete, spaceId]
  )

  const uploadDroppedEntries = useCallback(
    async (entries: DroppedEntry[]) => {
      if (!entries.length || !accessToken) return
      DriveApiService.setAccessToken(accessToken)
      setIsUploading(true)
      setProgress({ current: 0, total: entries.length, currentFileName: entries[0].file.name })

      try {
        const dirPaths = new Set<string>()
        for (const entry of entries) {
          const lastSlash = entry.relativePath.lastIndexOf('/')
          if (lastSlash > 0) {
            const parts = entry.relativePath.substring(0, lastSlash).split('/')
            for (let i = 1; i <= parts.length; i++) {
              dirPaths.add(parts.slice(0, i).join('/'))
            }
          }
        }

        const sortedDirs = Array.from(dirPaths).sort((a, b) => a.split('/').length - b.split('/').length)

        const pathToId = new Map<string, string>()
        for (const dir of sortedDirs) {
          const parts = dir.split('/')
          const name = parts[parts.length - 1]
          const parentPath = parts.slice(0, -1).join('/')
          const parentId = parentPath ? pathToId.get(parentPath) : (currentFolderId ?? undefined)
          const folder = await DriveApiService.createFolder(name, parentId, spaceId)
          pathToId.set(dir, folder.id)
        }

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          setProgress({ current: i, total: entries.length, currentFileName: entry.file.name })
          const lastSlash = entry.relativePath.lastIndexOf('/')
          const dir = lastSlash > 0 ? entry.relativePath.substring(0, lastSlash) : ''
          const folderId = dir ? pathToId.get(dir) : (currentFolderId ?? undefined)
          await DriveApiService.uploadFile(entry.file, folderId, spaceId)
        }
      } finally {
        setIsUploading(false)
        setProgress(null)
        onComplete()
      }
    },
    [accessToken, currentFolderId, onComplete, spaceId]
  )

  return { isUploading, progress, uploadFiles, uploadDroppedEntries }
}
