// Document URL construction utilities
import { env } from '@/common/env/EnvUtils'

interface Document {
  id: string
  name?: string | null
  file?: string | null
  mimeType?: string | null
}

interface DocumentUrls {
  viewUrl: string
  downloadUrl: string
  downloadFilename: string
}

/**
 * Get file extension from document name or fallback to mime type mapping
 */
export const getFileExtension = (document: Document): string => {
  // Try to get extension from file name first
  if (document.name && document.name.includes('.')) {
    return document.name.split('.').pop() || 'pdf'
  }

  // Fallback to mimeType mapping
  const mimeTypeExtensions: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'text/plain': 'txt'
  }

  return (document.mimeType && mimeTypeExtensions[document.mimeType]) || 'pdf'
}

/**
 * Normalize URL by removing double slashes and ensuring proper path structure
 */
const normalizeUrl = (url: string): string => {
  return url.replace(/([^:]\/)\/+/g, '$1')
}

/**
 * Construct document URLs for viewing and downloading
 */
export const buildDocumentUrls = (document: Document, opportunityId: string): DocumentUrls => {
  if (!document.file) {
    throw new Error('No file ID available for document')
  }

  const fileExtension = getFileExtension(document)

  // Construct base URL using environment variable
  const filesEndpoint = env('NEXT_PUBLIC_FILES_ENDPOINT') || ''
  const baseUrl = normalizeUrl(
    `${filesEndpoint}/files/api/v1/public/downloads/irm/opportunities/${opportunityId}/documents/`
  )
  let fileUrl: string

  if (document.file.includes('.')) {
    // File already has extension, use as is
    fileUrl = `${baseUrl}${document.file}`
  } else {
    // File doesn't have extension, add one
    fileUrl = `${baseUrl}${document.file}.${fileExtension}`
  }

  const downloadFilename = document.name || `document.${fileExtension}`

  return {
    viewUrl: fileUrl,
    downloadUrl: fileUrl,
    downloadFilename
  }
}
