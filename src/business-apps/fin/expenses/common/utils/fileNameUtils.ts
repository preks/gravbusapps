import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface HasEmployeeDocument {
  code?: string | null
  employeeDocument?: {
    file?: string | null
    name?: string | null
    employee?: { id?: string | null } | null
  } | null
  employee?: { id?: string | null } | null
}

/**
 * Extracts file name from URL query parameters
 */
const extractFileNameFromUrlParams = (fileUrl: string): string | null => {
  try {
    const url = new URL(fileUrl, globalThis.location?.origin || 'http://localhost')
    const paramName =
      url.searchParams.get('fileName') ||
      url.searchParams.get('filename') ||
      url.searchParams.get('name') ||
      url.searchParams.get('download')
    if (paramName) {
      const decoded = decodeURIComponent(paramName).trim()
      if (decoded) return decoded
    }
  } catch {
    // ignore (file might be a relative path or not a valid URL)
  }
  return null
}

/**
 * Extracts file name from URL path segment
 */
const extractFileNameFromPath = (fileUrl: string): string | null => {
  const clean = fileUrl.split('?')[0]
  const segment = clean.split('/').filter(Boolean).pop()
  if (segment) {
    try {
      return decodeURIComponent(segment)
    } catch {
      return segment
    }
  }
  return null
}

/**
 * Gets file name from employee document record.
 * Prioritizes the name field from query results, falls back to URL extraction if needed.
 */
export const getFileNameFromEmployeeDocument = (
  record: HasEmployeeDocument,
  fallbackTranslationKey?: string,
  fallbackDefault?: string
): string => {
  // First priority: use name from query results (most reliable)
  const name = record.employeeDocument?.name
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (trimmedName) return trimmedName

  // Second priority: extract from file URL if available
  const file = record.employeeDocument?.file
  const trimmedFile = typeof file === 'string' ? file.trim() : ''
  if (trimmedFile) {
    const urlFileName = extractFileNameFromUrlParams(trimmedFile)
    if (urlFileName) return urlFileName

    const pathFileName = extractFileNameFromPath(trimmedFile)
    if (pathFileName) return pathFileName
  }

  // Third priority: use code as fallback
  const code = record.code
  const trimmedCode = typeof code === 'string' ? code.trim() : ''
  if (trimmedCode) return `${trimmedCode}.pdf`

  // Last resort: use translation or default
  if (fallbackTranslationKey) {
    return getTranslationFromI18nKeyAndLabel(fallbackTranslationKey, fallbackDefault || 'document.pdf')
  }

  return fallbackDefault || 'document.pdf'
}
