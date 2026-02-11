/**
 * Sanitizes a filename by removing potentially dangerous characters.
 * Only allows alphanumeric characters, hyphens, underscores, and dots.
 */
export function sanitizeFilename(filename: string): string {
  return filename.replaceAll(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Validates and sanitizes a URL to prevent XSS attacks.
 * Only allows safe relative paths starting with '/'.
 * Rejects javascript:, data:, vbscript:, and other dangerous protocols.
 */
export function getSafeHref(url: string | null): string {
  if (!url) return '#'

  // Remove any leading/trailing whitespace and control characters
  const trimmedUrl = url.trim().replaceAll(/[\x00-\x1F\x7F]/g, '')

  // Block dangerous protocols (case-insensitive)
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i
  if (dangerousProtocols.test(trimmedUrl)) {
    return '#'
  }

  // Only allow relative paths that start with /
  // This prevents protocol-relative URLs like //evil.com
  if (!trimmedUrl.startsWith('/') || trimmedUrl.startsWith('//')) {
    return '#'
  }

  if (!trimmedUrl.startsWith('/platform')) {
    return '/platform' + trimmedUrl
  }

  return trimmedUrl
}

/**
 * Normalize excessive newlines and fix spacing issues
 */
export const normalizeNewlines = (text: string): string => {
  return text
    .replaceAll(/([.!?])([A-Z])/g, '$1 $2') // Add space between sentence end and next sentence start
    .replaceAll(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
    .replace(/^\n+/, '') // Remove leading newlines
    .replace(/\n+$/, '') // Remove trailing newlines
    .replaceAll(/\n\n+/g, '\n\n') // Ensure max 2 consecutive newlines
    .replaceAll(/\n\n+([-*]|\d+\.)\s/g, '\n$1 ') // Single newline before list items
    .replaceAll(/([-*]|\d+\.)\s.*\n\n+(?=[-*]|\d+\.)/g, match => match.replaceAll(/\n\n+/g, '\n'))
}
