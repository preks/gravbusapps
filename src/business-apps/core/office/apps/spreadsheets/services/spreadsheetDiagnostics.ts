export type SpreadsheetTraceScope = 'current_tab' | 'my_tabs_on_sheet' | 'all_participants_on_sheet'

export type SpreadsheetTraceEventSource = 'client' | 'server'
export type SpreadsheetTraceSeverity = 'info' | 'warning' | 'error'

export type SpreadsheetTraceSession = {
  id: string
  appId: string
  sheetId: string
  scope: SpreadsheetTraceScope
  startedByUserId: string
  startedByUserName?: string | null
  sessionId?: string | null
  tabId?: string | null
  ttlMinutes: number
  expiresAt: string
  stoppedAt: string | null
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
  summary: Record<string, unknown>
}

export type SpreadsheetTraceEvent = {
  id: string
  traceSessionId: string
  appId: string
  sheetId: string
  source: SpreadsheetTraceEventSource
  stage: string
  eventType?: string | null
  severity: SpreadsheetTraceSeverity
  traceId?: string | null
  batchId?: string | null
  operationId?: string | null
  operationType?: string | null
  sessionId?: string | null
  tabId?: string | null
  actorUserId?: string | null
  baseVersion?: number | null
  version?: number | null
  payload: Record<string, unknown>
  createdAt: string
}

export type SpreadsheetTraceFinding = {
  id: string
  traceSessionId: string
  appId: string
  sheetId: string
  findingType: string
  severity: SpreadsheetTraceSeverity
  message: string
  traceId?: string | null
  batchId?: string | null
  details: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type SpreadsheetTraceEventInput = {
  source: SpreadsheetTraceEventSource
  stage: string
  eventType?: string
  severity?: SpreadsheetTraceSeverity
  sheetId?: string | null
  traceSessionId?: string | null
  traceId?: string | null
  batchId?: string | null
  operationId?: string | null
  operationType?: string | null
  sessionId?: string | null
  tabId?: string | null
  actorUserId?: string | null
  baseVersion?: number | null
  version?: number | null
  payload?: Record<string, unknown>
}

export const SPREADSHEET_TRACE_SCOPE_OPTIONS: Array<{ value: SpreadsheetTraceScope; label: string }> = [
  { value: 'current_tab', label: 'Current tab' },
  { value: 'my_tabs_on_sheet', label: 'All my tabs in this workbook' },
  { value: 'all_participants_on_sheet', label: 'All participants in this workbook' }
]

export const SPREADSHEET_TRACE_TTL_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: 120, label: '2 h' },
  { value: 240, label: '4 h' },
  { value: 1440, label: '24 h' }
]

const TRACE_BROWSER_SESSION_KEY = 'spreadsheet-diagnostics-browser-session-id'
const TRACE_TAB_KEY = 'spreadsheet-diagnostics-tab-id'
export const SPREADSHEET_DIAGNOSTICS_BUTTON_OVERRIDE_STORAGE_KEY = 'spreadsheet-diagnostics-button'

export const getSpreadsheetTraceHintStorageKey = (appId: string, sheetId: string): string =>
  `spreadsheet-diagnostics-trace:${appId}:${sheetId}`

const safeStorageGet = (storage: Storage | undefined, key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

const safeStorageSet = (storage: Storage | undefined, key: string, value: string): void => {
  try {
    storage?.setItem(key, value)
  } catch {
    // Ignore unavailable storage.
  }
}

const createId = (prefix: string): string => {
  try {
    return crypto.randomUUID()
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

export const getOrCreateSpreadsheetDiagnosticsSessionId = (): string => {
  const existing = safeStorageGet(globalThis.localStorage, TRACE_BROWSER_SESSION_KEY)
  if (existing) return existing
  const next = createId('spreadsheet_diag_session')
  safeStorageSet(globalThis.localStorage, TRACE_BROWSER_SESSION_KEY, next)
  return next
}

export const getOrCreateSpreadsheetDiagnosticsTabId = (): string => {
  const existing = safeStorageGet(globalThis.sessionStorage, TRACE_TAB_KEY)
  if (existing) return existing
  const next = createId('spreadsheet_diag_tab')
  safeStorageSet(globalThis.sessionStorage, TRACE_TAB_KEY, next)
  return next
}

export const createSpreadsheetTraceId = (prefix = 'spreadsheet_trace'): string => createId(prefix)

export const isSpreadsheetDiagnosticsButtonOverrideEnabled = (): boolean =>
  safeStorageGet(globalThis.localStorage, SPREADSHEET_DIAGNOSTICS_BUTTON_OVERRIDE_STORAGE_KEY) === '1'

export const isSpreadsheetTraceSessionExpired = (
  session: SpreadsheetTraceSession | null | undefined,
  now = Date.now()
): boolean => {
  if (!session) return true
  if (session.stoppedAt) return true
  const expiresAt = Date.parse(session.expiresAt)
  return !Number.isFinite(expiresAt) || expiresAt <= now
}

export const persistSpreadsheetTraceHint = (
  appId: string,
  sheetId: string,
  session: SpreadsheetTraceSession | null
): void => {
  const key = getSpreadsheetTraceHintStorageKey(appId, sheetId)
  try {
    if (!session || isSpreadsheetTraceSessionExpired(session)) {
      globalThis.localStorage?.removeItem(key)
      return
    }
    globalThis.localStorage?.setItem(key, JSON.stringify(session))
  } catch {
    // Ignore unavailable storage.
  }
}

export const readSpreadsheetTraceHint = (appId: string, sheetId: string): SpreadsheetTraceSession | null => {
  const key = getSpreadsheetTraceHintStorageKey(appId, sheetId)
  const raw = safeStorageGet(globalThis.localStorage, key)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as SpreadsheetTraceSession
    if (isSpreadsheetTraceSessionExpired(session)) {
      globalThis.localStorage?.removeItem(key)
      return null
    }
    return session
  } catch {
    return null
  }
}
