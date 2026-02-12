import { env } from '@/common/env/EnvUtils'

const trimTrailingSlash = (url: string): string => {
  const trimmed = url.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
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
