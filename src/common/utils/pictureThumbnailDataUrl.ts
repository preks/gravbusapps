/**
 * Converts API pictureThumbnail values (base64 or URL) into a value suitable for img/AvatarImage src.
 */
export function pictureThumbnailToDataUrl(pictureThumbnail: string | null | undefined): string | undefined {
  if (pictureThumbnail == null) {
    return undefined
  }

  const trimmed = pictureThumbnail.trim()
  if (!trimmed) {
    return undefined
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }

  if (trimmed.startsWith('{')) {
    return undefined
  }

  const compact = trimmed.replace(/\s+/g, '')

  if (compact.startsWith('/9j/') || compact.startsWith('iVBORw0KGgo') || compact.startsWith('R0lGOD')) {
    if (compact.startsWith('iVBORw0KGgo')) {
      return `data:image/png;base64,${compact}`
    }
    if (compact.startsWith('R0lGOD')) {
      return `data:image/gif;base64,${compact}`
    }
    return `data:image/jpeg;base64,${compact}`
  }

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  return `data:image/jpeg;base64,${compact}`
}
