import { env } from '@/common/env/EnvUtils'

const DEFAULT_DOCUMENT_SERVICE_URL = 'https://newwork-dev.newwork.com/document/api/v1'

const normalizeBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  if (trimmed.endsWith('/document/api/v1')) {
    return trimmed
  }
  if (trimmed.endsWith('/document')) {
    return `${trimmed}/api/v1`
  }
  try {
    const url = new URL(trimmed)
    return `${url.origin}/document/api/v1`
  } catch {
    return `${trimmed}/document/api/v1`
  }
}

export const getDocumentServiceApiUrl = (): string => {
  const viteUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCUMENT_SERVICE_URL
      ? import.meta.env.VITE_DOCUMENT_SERVICE_URL
      : undefined
  if (viteUrl) {
    return normalizeBaseUrl(viteUrl)
  }

  const publicUrl = env('NEXT_PUBLIC_DOCUMENT_SERVICE_URL')
  if (publicUrl) {
    return normalizeBaseUrl(publicUrl)
  }

  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl) {
    return normalizeBaseUrl(baseUrl)
  }

  return DEFAULT_DOCUMENT_SERVICE_URL
}
