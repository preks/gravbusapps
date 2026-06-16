export function resolveAgentInitial(name: string): string {
  const parts = name.replace(/_/g, ' ').split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function isImageAvatar(avatar: string | null | undefined): avatar is string {
  const value = avatar?.trim()
  return Boolean(
    value && (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'))
  )
}
