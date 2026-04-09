import { env } from '@/common/env/EnvUtils'
import { getDocumentServiceApiUrl } from './documentServiceUrl'

const trimTrailingSlash = (url: string): string => {
  const trimmed = url.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

export const getSpreadsheetServiceApiUrl = (): string => {
  const explicitUrl = env('NEXT_PUBLIC_SPREADSHEET_SERVICE_URL')
  if (explicitUrl) {
    return trimTrailingSlash(explicitUrl)
  }

  return getDocumentServiceApiUrl()
}

export const isDedicatedSpreadsheetServiceEnabled = (): boolean => {
  return Boolean(env('NEXT_PUBLIC_SPREADSHEET_SERVICE_URL'))
}
