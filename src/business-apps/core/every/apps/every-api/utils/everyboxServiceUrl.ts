import { env } from '@/common/env/EnvUtils'

const trimTrailingSlash = (url: string): string => {
  const trimmed = url.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

const buildFromBaseUrl = (baseUrl: string): string => {
  const trimmed = trimTrailingSlash(baseUrl)
  return trimmed.endsWith('/everybox/api/v1') ? trimmed : `${trimmed}/everybox/api/v1`
}

export const getEveryboxServiceApiUrl = (): string => {
  const publicUrl = env('NEXT_PUBLIC_EVERYBOX_SERVICE_URL')
  if (publicUrl) {
    return trimTrailingSlash(publicUrl)
  }

  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl) {
    return buildFromBaseUrl(baseUrl)
  }

  throw new Error('Everybox service URL is not configured')
}
