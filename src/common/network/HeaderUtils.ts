export function getAccessTokenFromAuthorizationHeader(authorizationHeader: string | undefined): string {
  try {
    return `${(authorizationHeader as string).split('Bearer ')[1]}`
  } catch {
    return ''
  }
}

export function setAccessTokenToAuthorizationHeader(accessToken: string): string {
  try {
    return `Bearer ${accessToken}`
  } catch {
    return ''
  }
}

/** Same rules as search-service `.example` admin UI: trim, accept optional `Bearer ` prefix, else omit header. */
export function normalizeBearerAccessToken(accessToken: unknown): string | null {
  if (typeof accessToken !== 'string') return null
  const trimmed = accessToken.trim()
  if (!trimmed) return null
  if (trimmed === '[object Object]') return null
  if (trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return null
  if (trimmed.startsWith('Bearer ')) {
    const raw = trimmed.slice('Bearer '.length).trim()
    return raw || null
  }
  return trimmed
}

export function assignBearerAuthorizationHeader(headers: Record<string, string>, accessToken: string): void {
  const normalized = normalizeBearerAccessToken(accessToken)
  if (!normalized) {
    delete headers.Authorization
    delete headers['Authorization']
    return
  }
  const value = setAccessTokenToAuthorizationHeader(normalized)
  headers.Authorization = value
}
