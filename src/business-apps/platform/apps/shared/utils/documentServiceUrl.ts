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
  const publicUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_URL')
  if (publicUrl) {
    // Treat the env var as authoritative (same as other NEXT_PUBLIC_* URL configs)
    return trimTrailingSlash(publicUrl)
  }

  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl) {
    return buildFromBaseUrl(baseUrl)
  }

  throw new Error('Document service URL is not configured')
}
