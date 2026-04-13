import { env } from '@/common/env/EnvUtils'

const trimTrailingSlash = (url: string): string => {
  const trimmed = url.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

const isLocalUrl = (url: string): boolean => {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url.trim())
}

const isLocalRuntime = (): boolean => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
}

const buildFromBaseUrl = (baseUrl: string): string => {
  const trimmed = trimTrailingSlash(baseUrl)
  return trimmed.endsWith('/document/api/v1') ? trimmed : `${trimmed}/document/api/v1`
}

export const getDocumentServiceApiUrl = (): string => {
  // 1. First priority: Explicit debug URL (for local development pointing to dev server)
  const debugUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_DEBUG_URL')
  if (debugUrl) {
    return trimTrailingSlash(debugUrl)
  }

  // 2. In localhost runtime, force local document-service unless an explicit local URL is configured.
  // This prevents accidental calls to develop/staging when running FE + BE locally.
  if (isLocalRuntime()) {
    const publicUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_URL')
    if (publicUrl && isLocalUrl(publicUrl)) {
      return trimTrailingSlash(publicUrl)
    }

    const baseUrl = env('NEXT_PUBLIC_BASE_URL')
    if (baseUrl && isLocalUrl(baseUrl)) {
      return buildFromBaseUrl(baseUrl)
    }

    const localUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_LOCAL_URL') || 'http://localhost:3002/api/v1'
    return trimTrailingSlash(localUrl)
  }

  // 2. Check for explicit document service URL
  const publicUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_URL')
  if (publicUrl) {
    return trimTrailingSlash(publicUrl)
  }

  // 3. Build from base URL
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl) {
    return buildFromBaseUrl(baseUrl)
  }

  throw new Error('Document service URL is not configured')
}

/**
 * Base URL for the office collaboration WebSocket client when `NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL` is unset.
 * Matches the host (and `/document` prefix when the REST API is mounted there) used by
 * {@link getDocumentServiceApiUrl} so collaboration persist and spreadsheet REST hit the same backend.
 */
export function getDocumentOfficeWebSocketBaseUrl(): string {
  const apiUrl = getDocumentServiceApiUrl()
  const parsed = new URL(apiUrl)
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  if (pathname.includes('/document/')) {
    return `${parsed.origin}/document`
  }
  return parsed.origin
}
