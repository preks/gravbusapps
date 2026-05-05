const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i
const BARE_DOMAIN_PATTERN = /^(localhost|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(:\d+)?(?:[/?#].*)?$/i

/**
 * Excalidraw stores links exactly as entered. Normalize bare domains like
 * `google.com` so they behave like a real external URL on click.
 */
export function normalizeWhiteboardLink(rawLink?: string | null): string | null {
  if (typeof rawLink !== 'string') {
    return null
  }

  const trimmedLink = rawLink.trim()

  if (!trimmedLink) {
    return null
  }

  if (URL_SCHEME_PATTERN.test(trimmedLink)) {
    return trimmedLink
  }

  if (trimmedLink.startsWith('//')) {
    return `https:${trimmedLink}`
  }

  if (trimmedLink.startsWith('/') || trimmedLink.startsWith('?') || trimmedLink.startsWith('#')) {
    return trimmedLink
  }

  if (BARE_DOMAIN_PATTERN.test(trimmedLink)) {
    return `https://${trimmedLink}`
  }

  return trimmedLink
}
