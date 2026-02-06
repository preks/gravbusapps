/**
 * Utility to determine if a file can be previewed in the browser
 */

/**
 * Check if a file can be previewed natively in the browser
 * @param mimeType - MIME type of the file
 * @returns true if browser can preview, false if it should download
 */
export function isPreviewableFile(mimeType?: string | null): boolean {
  if (!mimeType) return false

  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/')
  )
}
