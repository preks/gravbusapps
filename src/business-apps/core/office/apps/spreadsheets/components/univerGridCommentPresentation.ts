export function formatCommentTime(value?: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString()
}

export function getInitials(name?: string): string {
  const n = (name || '').trim()
  if (!n) return 'U'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'U'
}

export function areCursorRectsEqual(
  a: Record<string, { top: number; left: number; width: number; height: number }>,
  b: Record<string, { top: number; left: number; width: number; height: number }>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const ra = a[key]
    const rb = b[key]
    if (!rb) return false
    if (
      Math.abs(ra.top - rb.top) > 0.5 ||
      Math.abs(ra.left - rb.left) > 0.5 ||
      Math.abs(ra.width - rb.width) > 0.5 ||
      Math.abs(ra.height - rb.height) > 0.5
    ) {
      return false
    }
  }
  return true
}
