/**
 * Allow only http(s) URLs for anchors (e.g. pipeline links). Blocks javascript:, data:, etc.
 * Kept in a standalone module so static analysis does not conflate UI filter state with URL values.
 */
export function safeExternalHttpUrl(url: string | null | undefined): string | undefined {
  if (url == null || typeof url !== 'string' || url.length === 0) return undefined
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined
    return u.href
  } catch {
    return undefined
  }
}
