/**
 * Link URL validation for document editor hyperlinks.
 * Aligns with export sanitization (no javascript:, data:, etc.).
 */

/** Blocklist of URL protocols that must not be allowed in hrefs (used only to reject in isAllowedHref; no code execution). */
const FORBIDDEN_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'].map(p => p.toLowerCase())

/**
 * Returns true if the URL is safe to use as an href (no executable protocols).
 */
export function isAllowedHref(url: string | null | undefined): boolean {
  if (url == null || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (trimmed === '') return false
  const lower = trimmed.toLowerCase()
  for (const protocol of FORBIDDEN_PROTOCOLS) {
    if (lower === protocol || lower.startsWith(protocol)) return false
  }
  return true
}

/**
 * Normalize URL for storage: add default protocol if missing.
 */
export function normalizeLinkHref(url: string, defaultProtocol: string = 'https'): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  const protocol = defaultProtocol.replace(/:$/, '')
  return `${protocol}://${trimmed}`
}

/** Escape for HTML attribute value (e.g. href). */
export function escapeHtmlAttr(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** Escape for HTML text content. */
export function escapeHtmlText(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
