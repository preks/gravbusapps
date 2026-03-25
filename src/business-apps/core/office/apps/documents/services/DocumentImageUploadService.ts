/**
 * Document image upload service.
 * Uploads images to file service for use in document content (Google Docs / Word style).
 */

import { env } from '@/common/env/EnvUtils'

const FILES_ENDPOINT = env('NEXT_PUBLIC_FILE_SERVICE_ENDPOINT')

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'] as const

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

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
    webp: 'image/webp',
    svg: 'image/svg+xml'
  }
  return mime[ext ?? ''] ?? 'image/png'
}

function isAllowedImageType(mime: string): boolean {
  const lower = mime.toLowerCase()
  return ALLOWED_IMAGE_TYPES.some(t => lower === t || lower.startsWith('image/'))
}

export interface UploadDocumentImageResult {
  url: string
}

/**
 * Upload a single image file for use in a document.
 * When documentId is null (unsaved document), uses temp folder or returns data URL.
 */
export async function uploadDocumentImage(
  file: File,
  documentId: string | null,
  accessToken: string
): Promise<UploadDocumentImageResult> {
  const mime = getMimeType(file)
  if (!isAllowedImageType(mime)) {
    throw new Error('File must be an image (PNG, JPEG, GIF, WebP, or SVG)')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image must be 10MB or smaller')
  }

  if (!FILES_ENDPOINT || !accessToken) {
    return toDataUrl(file)
  }

  const folderPath = documentId ? `/documents/${documentId}/images` : `/documents/temp/${Date.now()}`

  const url = `${FILES_ENDPOINT}/tenant/files?appName=document-app&folderPath=${encodeURIComponent(folderPath)}&mimeType=${encodeURIComponent(mime)}`
  const formData = new FormData()
  formData.append('fileContent', file, file.name)

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }

  const result = (await response.json()) as {
    fileId?: string
    path?: string
    downloadPath?: string
    url?: string
    downloadUrl?: string
    fileInfo?: {
      fileId?: string
      path?: string
      downloadPath?: string
      folderPath?: string
    }
  }

  const imageUrl = resolveImageUrlFromApiResult(result)
  if (!imageUrl || (!imageUrl.startsWith('/files') && !imageUrl.startsWith('http'))) {
    return toDataUrl(file)
  }
  const finalUrl = toAbsoluteFileUrlIfNeeded(imageUrl)
  return { url: finalUrl }
}

type ApiUploadResult = {
  url?: string
  downloadUrl?: string
  path?: string
  downloadPath?: string
  fileId?: string
  fileInfo?: { fileId?: string; path?: string; downloadPath?: string }
}

function resolveImageUrlFromApiResult(result: ApiUploadResult): string {
  const fileInfo = result.fileInfo ?? result
  let imageUrl = result.url ?? result.downloadUrl ?? fileInfo.downloadPath ?? fileInfo.path ?? ''
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  if (imageUrl && !imageUrl.startsWith('/files') && !imageUrl.startsWith('http')) {
    const pathPart = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
    imageUrl = pathPart.startsWith('/api/')
      ? `/files${pathPart}`
      : `/files/api/v1/tenant/downloads/document-app${pathPart}`
  }
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
    imageUrl = `/files/${imageUrl}`
  }
  if (fileInfo.fileId && !imageUrl) {
    imageUrl = `/files/api/v1/tenant/downloads/document-app/${fileInfo.fileId}`
  }
  return imageUrl
}

/** If FILES_ENDPOINT is an absolute URL on another origin, return absolute URL so img loads without proxy. */
function toAbsoluteFileUrlIfNeeded(relativePath: string): string {
  const endpoint = FILES_ENDPOINT
  const isAbsoluteEndpoint = Boolean(endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://')))
  if (!endpoint || !isAbsoluteEndpoint) {
    return relativePath
  }
  if (relativePath.startsWith('data:') || relativePath.startsWith('http')) {
    return relativePath
  }
  try {
    const base = new URL(endpoint) // typically: https://<host>/files/api/v1
    const isSameOrigin = globalThis.window?.location?.origin === base.origin
    if (isSameOrigin) {
      return relativePath
    }

    const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`

    // Preserve platform proxy paths ("/files/...") when constructing absolute URLs.
    // Stripping "/files" creates invalid URLs on environments where the file-service is hosted under "/files".
    if (normalized.startsWith('/files/')) {
      return `${base.origin}${normalized}`
    }

    // Some APIs return "/api/v1/..." (without "/files") even though the file-service lives under "/files/api/v1".
    if (normalized.startsWith('/api/v1/')) {
      return `${base.origin}/files${normalized}`
    }

    // For "/tenant/..." paths, resolve relative to the FILES_ENDPOINT base pathname.
    // E.g. base.pathname "/files/api/v1" + "/tenant/..." => "/files/api/v1/tenant/..."
    const basePath = base.pathname.replace(/\/$/, '')
    return `${base.origin}${basePath}${normalized}`
  } catch {
    return relativePath
  }
}

function toDataUrl(file: File): Promise<UploadDocumentImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve({ url: dataUrl })
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
