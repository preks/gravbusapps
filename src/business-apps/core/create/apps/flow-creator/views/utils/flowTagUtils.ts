export function parseCatalogCode(value: string | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const parts = raw.split(':')
  return parts[parts.length - 1] || raw
}
