/**
 * Reads the JWT `sub` claim from an access token (browser-safe, no dependency).
 */
export function decodeAccessTokenSub(accessToken: string | null | undefined): string | undefined {
  if (!accessToken?.trim()) return undefined
  try {
    const parts = accessToken.trim().split('.')
    if (parts.length < 2) return undefined
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const decoded = atob(padded)
    const payload = JSON.parse(decoded) as { sub?: string }
    return typeof payload.sub === 'string' ? payload.sub : undefined
  } catch {
    return undefined
  }
}
