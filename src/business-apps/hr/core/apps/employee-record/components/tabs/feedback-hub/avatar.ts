export const toAvatarSrc = (thumb?: string | null): string | undefined => {
  if (!thumb) return undefined
  const t = thumb.trim()
  if (!t) return undefined
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('data:image')) return t

  const sig = t.slice(0, 12)
  let mime = 'image/jpeg'
  if (sig.startsWith('/9j/')) mime = 'image/jpeg'
  else if (sig.startsWith('iVBORw0KGgo')) mime = 'image/png'
  else if (sig.startsWith('R0lGOD')) mime = 'image/gif'
  else if (sig.startsWith('Qk')) mime = 'image/bmp'
  return `data:${mime};base64,${t}`
}
