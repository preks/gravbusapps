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
 * Normalize excessive newlines and fix spacing issues (ReDoS-safe: bounded quantifiers, no backtracking)
 */
export const normalizeNewlines = (text: string): string => {
  let s = text
    .replaceAll(/([.!?])([A-Z])/g, '$1 $2') // Add space between sentence end and next sentence start
    .replaceAll(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
    .replace(/^\n+/, '') // Remove leading newlines
  while (s.length > 0 && s[s.length - 1] === '\n') {
    s = s.slice(0, -1)
  }
  return s
    .replaceAll(/\n{2,100}/g, '\n\n') // Ensure max 2 consecutive newlines (bounded)
    .replaceAll(/\n{2,100}([-*]|\d+\.)\s/g, '\n$1 ') // Single newline before list items (bounded)
    .replaceAll(/([-*]|\d+\.)\s[^\n]*\n{2,100}(?=[-*]|\d+\.)/g, match => match.replaceAll(/\n{2,100}/g, '\n'))
}
