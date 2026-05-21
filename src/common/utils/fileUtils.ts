/**
 * Utility functions for file handling
 */

import { env } from '@/common/env/EnvUtils'
import {
  FileIcon,
  FileTextIcon,
  FileImageIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileCodeIcon,
  Icon
} from '@phosphor-icons/react'
import { FileInfo } from '@/common/types/FileTypes'

/**
 * Build a file URL from fileInfo object
 * @param fileInfo - FileInfo object from file service
 * @returns URL to access the file
 */
export function buildFileUrl(fileInfo: FileInfo): string

/**
 * Build a file URL from fileInfo object and fetch it as a blob URL with authentication
 * @param fileInfo - FileInfo object from file service
 * @param accessToken - Access token for authentication
 * @returns Promise that resolves to a blob URL (e.g., "blob:http://...")
 */
export function buildFileUrl(fileInfo: FileInfo, accessToken: string): Promise<string>

export function buildFileUrl(fileInfo: FileInfo, accessToken?: string): string | Promise<string> {
  if (!fileInfo) {
    throw new Error('No fileInfo provided')
  }

  // Extract path from fileInfo (contains complete path)
  const { path } = fileInfo

  if (!path) {
    throw new Error('No path found in fileInfo')
  }

  // Normalize path: remove leading slash if present to avoid double slashes
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path

  // Build URL: BASE_URL + /files/ + path
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  const url = `${baseUrl}/files/${normalizedPath}`

  // If no access token, return URL string (backwards compatible)
  if (!accessToken) {
    console.log('No access token provided, returning URL string')
    return url
  }

  // If access token provided, fetch as blob and return Promise
  return fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
      }
      return response.blob()
    })
    .then(blob => URL.createObjectURL(blob))
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes || bytes === 0) return '0 Bytes'

  // Validate input is a valid number
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) {
    return '0 Bytes'
  }

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  // Ensure index is within bounds
  const sizeIndex = Math.min(i, sizes.length - 1)
  const formattedSize = Number.parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2))

  // Handle potential NaN from parseFloat
  if (Number.isNaN(formattedSize)) {
    return '0 Bytes'
  }

  return `${formattedSize} ${sizes[sizeIndex]}`
}

/**
 * Shorten a file name for compact UI (preserves extension when possible).
 */
export function truncateFileName(fileName: string, maxLength = 15): string {
  if (!fileName || fileName.length <= maxLength) {
    return fileName || ''
  }

  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  const name = fileName.substring(0, lastDotIndex)
  const extension = fileName.substring(lastDotIndex)

  if (extension.length >= maxLength - 3) {
    return '...' + extension
  }

  if (name.length <= 3) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  const maxNameLength = maxLength - extension.length - 3
  return name.substring(0, maxNameLength) + '...' + extension
}

/**
 * Get appropriate file icon component based on MIME type
 * Returns the component itself (not instantiated), caller must render it
 * @param mimeType - MIME type of the file
 * @returns Icon component
 */
export const getFileIcon = (mimeType?: string): Icon => {
  if (!mimeType) return FileIcon

  if (mimeType.includes('pdf')) return FileTextIcon
  if (mimeType.includes('image')) return FileImageIcon
  if (mimeType.includes('video')) return FileVideoIcon
  if (mimeType.includes('audio')) return FileAudioIcon
  if (mimeType.includes('code') || mimeType.includes('text')) return FileCodeIcon

  return FileIcon
}

export type FileEntity = string & { readonly __brand: 'FileEntity' }
export type FileContext = string & { readonly __brand: 'FileContext' }

export const buildFilePath = (entity: FileEntity, entityId: string | null, context: FileContext): string => {
  if (!entityId) {
    entityId = 'temp-' + crypto.randomUUID()
  }
  return `/${entity}/${entityId}/${context}`
}

export type AvatarFileRef = { current: { file: File; thumbnail: string } | null }

type AvatarFileClient = {
  uploadFile: (file: File, pathParams: any, queryParams: any) => Promise<{ fileInfo: any }>
}

/**
 * Returns a pre-submit handler that uploads an avatar file and enriches formData
 * with `picture` and `pictureThumbnail` fields. Pass-through when no avatar is staged.
 */
export const buildAvatarPreSubmit =
  (
    fileClient: AvatarFileClient,
    avatarFileRef: AvatarFileRef,
    fileEntity: FileEntity,
    fileContext: FileContext,
    appName: string,
    getEntityId: (formData: Record<string, any>) => string | null
  ) =>
  async (formData: Record<string, any>) => {
    const avatarData = avatarFileRef.current

    if (!avatarData?.file || !avatarData?.thumbnail) {
      return formData
    }

    try {
      const folderPath = buildFilePath(fileEntity, getEntityId(formData), fileContext)
      const pathParams = { accessScope: 'tenant' } as const
      const queryParams = { appName, folderPath, mimeType: avatarData.file.type }
      const uploadResponse = await fileClient.uploadFile(avatarData.file, pathParams, queryParams)

      return {
        ...formData,
        picture: JSON.stringify(uploadResponse.fileInfo),
        pictureThumbnail: avatarData.thumbnail
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      throw error
    }
  }

/**
 * Generic interface for file upload results
 */
export interface UploadFileResult {
  name: string
  fileInfo: any
}

/**
 * Generic function to upload files to storage
 * @param files - Array of files to upload
 * @param referenceEntityId - ID of the reference entity
 * @param fileEntity - File entity constant (e.g., FILE_ENTITY.ACCOUNT)
 * @param fileContext - Context for file storage (e.g., FILE_CONTEXT.ACTIVITY)
 * @param appName - Application name for file storage
 * @param fileClient - File client instance for uploading
 * @returns Array of uploaded file metadata
 */
export const uploadFiles = async (
  files: File[],
  referenceEntityId: string,
  fileEntity: FileEntity,
  fileContext: FileContext,
  appName: string,
  fileClient: { uploadFile: (file: File, pathParams: any, queryParams: any) => Promise<{ fileInfo: any }> }
): Promise<UploadFileResult[]> => {
  if (!files || files.length === 0) return []

  const folderPath = buildFilePath(fileEntity, referenceEntityId, fileContext)

  const uploadPromises = files.map(async file => {
    const result = await fileClient.uploadFile(
      file,
      { accessScope: 'tenant' },
      {
        appName: appName,
        folderPath: folderPath,
        mimeType: file.type
      }
    )

    return {
      name: file.name,
      fileInfo: result.fileInfo
    }
  })

  return await Promise.all(uploadPromises)
}
