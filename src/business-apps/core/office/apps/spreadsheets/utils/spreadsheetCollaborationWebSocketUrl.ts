import { env } from '@/common/env/EnvUtils'
import { resolveServiceUrl } from '@/common/utils/serviceResolver'
import {
  getDocumentOfficeWebSocketBaseUrl,
  getDocumentServiceApiUrl
} from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const spreadsheetCollabWsWarnings = new Set<string>()

function warnSpreadsheetCollabWsOnce(key: string, message: string, meta: Record<string, string>): void {
  if (spreadsheetCollabWsWarnings.has(key)) return
  spreadsheetCollabWsWarnings.add(key)
  console.warn(`[spreadsheet-collaboration] ${message}`, meta)
}

/**
 * WebSocket base URL for spreadsheet collaboration only.
 * Aligns with `getDocumentServiceApiUrl()` and corrects common mis-set
 * `NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL` values (wrong origin or `/document` on bare document-service).
 * Other office apps use `getOfficeWebSocketUrl()` from `serviceResolver` unchanged.
 */
export function getSpreadsheetCollaborationWebSocketBaseUrl(): string {
  let derived: string
  try {
    derived = getDocumentOfficeWebSocketBaseUrl()
  } catch {
    const explicitWs = env('NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL')
    if (explicitWs?.trim()) {
      const trimmed = explicitWs.trim()
      return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
    }
    return resolveServiceUrl('NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL', {
      servicePath: '/document',
      apiPath: ''
    })
  }

  const explicitWs = env('NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL')
  if (!explicitWs?.trim()) {
    return derived
  }

  const trimmed = explicitWs.trim().replace(/\/+$/, '')
  let explicitOrigin: string
  let explicitPathname: string
  try {
    const parsed = new URL(trimmed)
    explicitOrigin = parsed.origin
    explicitPathname = (parsed.pathname.replace(/\/+$/, '') || '/').toLowerCase()
  } catch {
    warnSpreadsheetCollabWsOnce(
      'ws-url-parse',
      'Invalid NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL; using document REST host.',
      {
        NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL: trimmed,
        usingBase: derived
      }
    )
    return derived
  }

  const derivedOrigin = new URL(derived).origin
  if (explicitOrigin !== derivedOrigin) {
    warnSpreadsheetCollabWsOnce(
      'ws-origin-mismatch',
      'NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL origin does not match the document REST API host; using the REST-aligned WebSocket base.',
      { explicitWebSocket: trimmed, usingBase: derived }
    )
    return derived
  }

  let apiPathHasDocumentMount = false
  try {
    const apiPath = new URL(getDocumentServiceApiUrl()).pathname.replace(/\/+$/, '') || '/'
    apiPathHasDocumentMount = apiPath.includes('/document/')
  } catch {
    // keep false
  }

  const explicitUsesDocumentPath = explicitPathname.endsWith('/document') || explicitPathname.includes('/document/')

  if (!apiPathHasDocumentMount && explicitUsesDocumentPath) {
    warnSpreadsheetCollabWsOnce(
      'ws-document-path-without-api-mount',
      'NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL includes /document but the spreadsheet REST API is not under /document; using the host root for WebSocket (matches bare document-service).',
      { explicitWebSocket: trimmed, usingBase: derived }
    )
    return derived
  }

  return trimmed
}
