export function pictureThumbnailToDataUrl(pictureThumbnail: string | null | undefined): string | undefined {
  if (pictureThumbnail == null) return undefined

  const trimmed = pictureThumbnail.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }

  if (trimmed.startsWith('{')) {
    return undefined
  }

  if (trimmed.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${trimmed}`
  }
  if (trimmed.startsWith('R0lGOD')) {
    return `data:image/gif;base64,${trimmed}`
  }

  return `data:image/jpeg;base64,${trimmed}`
}
