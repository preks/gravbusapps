import { DOCUMENT_API_URL, DOCUMENT_WEB_SOCKET_URL } from '@/common/utils/serviceResolver'

export const getDocumentServiceApiUrl = (): string => {
  return DOCUMENT_API_URL
}

export function getDocumentOfficeWebSocketBaseUrl(): string {
  return DOCUMENT_WEB_SOCKET_URL
}
