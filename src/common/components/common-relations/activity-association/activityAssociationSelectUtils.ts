export function selectOnChangeToId(v: unknown): string | null {
  if (v === null || v === '') {
    return null
  }
  if (Array.isArray(v)) {
    const last = v[v.length - 1]
    if (last === null || last === undefined || last === '') {
      return null
    }
    if (typeof last === 'object' && last !== null && 'id' in last) {
      return (last as { id: string }).id || null
    }
    return String(last)
  }
  if (typeof v === 'object' && v !== null && 'id' in v) {
    return (v as { id: string }).id || null
  }
  return String(v)
}
