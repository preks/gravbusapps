/**
 * Upload note inline images to Drive and build download URLs for persisted HTML.
 */

import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const DRIVE_FILE_DOWNLOAD_PATH = /\/drive\/files\/([^/]+)\/download/

function getMimeType(file: File): string {
  if (file.type?.startsWith('image/')) {
    return file.type
  }
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mime: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
  }
  if (ext && mime[ext]) {
    return mime[ext]
  }
  return file.type || 'application/octet-stream'
}

function isAllowedImageMime(mime: string): boolean {
  const lower = mime.toLowerCase()
  return ALLOWED_IMAGE_TYPES.some(t => lower === t)
}

export function validateNoteImageFile(
  file: File
): { ok: true } | { ok: false; errorKey: 'note-image-unsupported-type' | 'note-image-too-large' } {
  const mime = getMimeType(file)
  if (!isAllowedImageMime(mime)) {
    return { ok: false, errorKey: 'note-image-unsupported-type' }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, errorKey: 'note-image-too-large' }
  }
  return { ok: true }
}

export function buildDriveImageDownloadUrl(fileId: string, apiBaseUrl?: string): string {
  const base = (apiBaseUrl ?? getDocumentServiceApiUrl()).replace(/\/+$/, '')
  return `${base}/drive/files/${fileId}/download`
}

export function extractDriveFileIdFromImageSrc(src: string): string | null {
  if (!src || src.startsWith('data:')) return null
  const match = src.match(DRIVE_FILE_DOWNLOAD_PATH)
  return match?.[1] ?? null
}

/** Drive file downloads require Authorization; CustomImage resolves via blob. */
export function isNoteDriveImageProtectedSrc(src: string): boolean {
  if (!src || src.startsWith('data:')) return false
  return DRIVE_FILE_DOWNLOAD_PATH.test(src)
}

function resolveUploadedDriveFileId(res: DriveItem | { entityType: string; entityId: string; name: string }): string {
  if ('id' in res && typeof res.id === 'string' && res.id.length > 0) {
    return res.id
  }
  if ('entityId' in res && typeof res.entityId === 'string' && res.entityId.length > 0) {
    return res.entityId
  }
  throw new Error('Unexpected drive upload response')
}

export interface UploadNoteDriveImageOptions {
  folderId?: string
  spaceId?: string | null
}

/**
 * Uploads an image file to Drive and returns the absolute download URL to store in note HTML.
 */
export async function uploadNoteDriveImage(
  file: File,
  accessToken: string,
  options?: UploadNoteDriveImageOptions
): Promise<{ url: string; fileId: string }> {
  const validation = validateNoteImageFile(file)
  if (!validation.ok) {
    throw new Error(validation.errorKey)
  }
  if (!accessToken) {
    throw new Error('note-image-upload-no-token')
  }

  DriveApiService.setAccessToken(accessToken)
  const res = await DriveApiService.uploadFile(
    file,
    options?.folderId,
    options?.spaceId === null || options?.spaceId === undefined ? undefined : options.spaceId
  )
  const fileId = resolveUploadedDriveFileId(res)
  const url = buildDriveImageDownloadUrl(fileId)
  return { url, fileId }
}

export async function resolveNoteDriveImageProtectedSrc(src: string, accessToken: string): Promise<Blob> {
  const fileId = extractDriveFileIdFromImageSrc(src)
  if (!fileId) {
    throw new Error('Invalid drive image URL')
  }
  if (!accessToken) {
    throw new Error('Missing token for image download')
  }
  DriveApiService.setAccessToken(accessToken)
  const { blob } = await DriveApiService.getFilePreviewBlob(fileId)
  return blob
}
