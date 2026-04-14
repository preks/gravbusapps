import {
  getDocumentOfficeWebSocketBaseUrl as resolveDocumentOfficeWebSocketBaseUrl,
  getDocumentServiceApiUrl as resolveDocumentServiceApiUrl
} from '@/common/utils/serviceResolver'

export const getDocumentServiceApiUrl = (): string => {
  return resolveDocumentServiceApiUrl()
}

/**
 * Base URL for the office collaboration WebSocket client when `NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL` is unset.
 * Matches the host (and `/document` prefix when the REST API is mounted there) used by
 * {@link getDocumentServiceApiUrl} so collaboration persist and spreadsheet REST hit the same backend.
 */
export function getDocumentOfficeWebSocketBaseUrl(): string {
  return resolveDocumentOfficeWebSocketBaseUrl()
}
