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
export const buildFileUrl = (fileInfo: FileInfo): string => {
  if (!fileInfo) {
    throw new Error('No fileInfo provided')
  }

  // Extract path from fileInfo (contains complete path)
  const { path } = fileInfo

  if (!path) {
    throw new Error('No path found in fileInfo')
  }

  // Build URL: BASE_URL + /files/ + path
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  return `${baseUrl}/files/${path}`
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
