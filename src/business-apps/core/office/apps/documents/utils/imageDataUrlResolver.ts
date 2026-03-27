/**
 * Shared image src → data URL resolution for document editors (export/embed).
 * Split into small helpers to keep cognitive complexity low (Sonar S3776).
 */

import { sanitizeInlineImageDataUrl } from '@/common/utils/safeUrlUtils'

export interface ImageDataUrlResolverContext {
  accessToken: string | null | undefined
  fileClient: { downloadFileByPath(path: string, token: string): Promise<Blob> }
  blobToDataUrl: (blob: Blob) => Promise<string>
}

/**
 * Only preserve already-inline safe data URLs during export.
 * Remote and blob-backed images are left untouched to avoid re-encoding untrusted content.
 */
export async function resolveImageSrcToDataUrl(src: string): Promise<string | null> {
  if (!src) return null
  return sanitizeInlineImageDataUrl(src.trim())
}
