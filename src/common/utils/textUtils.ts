export const truncateText = (text?: string, max: number = 50): string => {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

/**
 * Sanitizes a filename to prevent XSS and path traversal attacks
 * Removes potentially dangerous characters and limits to safe alphanumeric characters
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for download operations
 *
 * @example
 * sanitizeFilename('report-2024.csv') // 'report-2024.csv'
 * sanitizeFilename('../../../etc/passwd') // '_etc_passwd'
 * sanitizeFilename('file<script>.txt') // 'file_script_.txt'
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove any characters that are not alphanumeric, dash, underscore, or dot
  // This prevents XSS, path traversal, and other injection attacks
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_') // Prevent path traversal with multiple dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255) // Limit filename length (filesystem limit)
}
