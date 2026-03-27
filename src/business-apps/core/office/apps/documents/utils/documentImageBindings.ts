import type {
  CustomImageUploadHandler,
  ImageUploadContext,
  ProtectedSrcResolution
} from '@/components/tiptap-extensions/tiptap-custom-image'
import { fileClient } from '@/common/network/files/FileClient'
import { uploadDocumentImage } from '../services/DocumentImageUploadService'

function resolveDocumentId(context: ImageUploadContext | undefined, fallbackDocumentId: string | null): string | null {
  if (typeof context?.documentId === 'string') {
    return context.documentId
  }

  return fallbackDocumentId
}

export function isDocumentImageProtectedSrc(src: string): boolean {
  if (!src || src.startsWith('data:')) return false

  try {
    const url = new URL(src, globalThis.location.origin)
    return url.pathname.includes('/tenant/downloads/')
  } catch {
    return false
  }
}

export function getDocumentImageDownloadPath(src: string): string {
  try {
    return new URL(src, globalThis.location.origin).pathname
  } catch {
    return src
  }
}

export async function resolveProtectedDocumentImageSrc(
  src: string,
  accessToken: string
): Promise<ProtectedSrcResolution> {
  return fileClient.downloadFileByPath(getDocumentImageDownloadPath(src), accessToken)
}

export function createDocumentImageUploadHandler(
  documentId: string | null,
  accessToken: string
): CustomImageUploadHandler {
  return (file, context) => uploadDocumentImage(file, resolveDocumentId(context, documentId), accessToken)
}
