/**
 * Converts a raw base64 picture thumbnail to a data URL.
 * Handles detection of image format (PNG, GIF, JPEG) based on base64 prefix.
 */
export function getPictureDataUrl(pictureThumbnail: string | null | undefined): string | undefined {
  if (!pictureThumbnail) return undefined

  const trimmed = pictureThumbnail.trim()
  if (!trimmed) return undefined

  // Already a URL or data URI
  if (trimmed.startsWith('http') || trimmed.startsWith('data:')) {
    return trimmed
  }

  // Skip invalid JSON-like values
  if (trimmed.startsWith('{')) {
    return undefined
  }

  // Detect format from base64 prefix
  if (trimmed.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${trimmed}`
  }
  if (trimmed.startsWith('R0lGOD')) {
    return `data:image/gif;base64,${trimmed}`
  }

  // Default to JPEG
  return `data:image/jpeg;base64,${trimmed}`
}
