import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from 'react'
import { toast } from 'sonner'

import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import {
  getOrCreateSpreadsheetDiagnosticsSessionId,
  getOrCreateSpreadsheetDiagnosticsTabId,
  getSpreadsheetTraceHintStorageKey,
  isSpreadsheetDiagnosticsButtonOverrideEnabled,
  isSpreadsheetTraceSessionExpired,
  persistSpreadsheetTraceHint,
  readSpreadsheetTraceHint,
  type SpreadsheetTraceEvent,
  type SpreadsheetTraceEventInput,
  type SpreadsheetTraceFinding,
  type SpreadsheetTraceScope,
  type SpreadsheetTraceSession
} from '../services/spreadsheetDiagnostics'

export interface UseSpreadsheetDiagnosticsTraceParams {
  appId: string
  activeSheetId: string
  activeSheetIdRef: MutableRefObject<string>
  debugLog: (message: string, meta?: Record<string, unknown>) => void
}

export interface UseSpreadsheetDiagnosticsTraceResult {
  showDiagnosticsButton: boolean
  diagnosticsBrowserSessionIdRef: MutableRefObject<string>
  diagnosticsTabIdRef: MutableRefObject<string>
  isDiagnosticsDialogOpen: boolean
  setIsDiagnosticsDialogOpen: (open: boolean) => void
  isDiagnosticsDialogOpenRef: MutableRefObject<boolean>
  diagnosticsScope: SpreadsheetTraceScope
  setDiagnosticsScope: (scope: SpreadsheetTraceScope) => void
  diagnosticsTtlMinutes: number
  setDiagnosticsTtlMinutes: (minutes: number) => void
  activeTraceSession: SpreadsheetTraceSession | null
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  traceSessions: SpreadsheetTraceSession[]
  selectedTraceSessionId: string | null
  setSelectedTraceSessionId: (id: string | null) => void
  selectedTraceSessionIdRef: MutableRefObject<string | null>
  traceEvents: SpreadsheetTraceEvent[]
  traceFindings: SpreadsheetTraceFinding[]
  setTraceEvents: Dispatch<SetStateAction<SpreadsheetTraceEvent[]>>
  setTraceFindings: Dispatch<SetStateAction<SpreadsheetTraceFinding[]>>
  isStartingTraceSession: boolean
  isStoppingTraceSession: boolean
  isRefreshingTraceData: boolean
  setAndPersistActiveTraceSession: (session: SpreadsheetTraceSession | null) => void
  refreshDiagnosticsData: (traceSessionId?: string, options?: { force?: boolean }) => Promise<void>
  refreshDiagnosticsTraceSessions: () => Promise<SpreadsheetTraceSession[]>
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  startDiagnosticsTraceSession: () => Promise<void>
  stopDiagnosticsTraceSession: () => Promise<void>
}

export function useSpreadsheetDiagnosticsTrace(
  params: UseSpreadsheetDiagnosticsTraceParams
): UseSpreadsheetDiagnosticsTraceResult {
  const { appId, activeSheetId, activeSheetIdRef, debugLog } = params

  const diagnosticsBrowserSessionIdRef = useRef<string>(getOrCreateSpreadsheetDiagnosticsSessionId())
  const diagnosticsTabIdRef = useRef<string>(getOrCreateSpreadsheetDiagnosticsTabId())
  const previewFeature = useFeature<boolean>(Feature.Preview.Enabled.Key)
  const showDiagnosticsButton = previewFeature === true || isSpreadsheetDiagnosticsButtonOverrideEnabled()

  const [isDiagnosticsDialogOpen, setIsDiagnosticsDialogOpen] = useState(false)
  const isDiagnosticsDialogOpenRef = useRef(false)
  isDiagnosticsDialogOpenRef.current = isDiagnosticsDialogOpen

  const [diagnosticsScope, setDiagnosticsScope] = useState<SpreadsheetTraceScope>('my_tabs_on_sheet')
  const [diagnosticsTtlMinutes, setDiagnosticsTtlMinutes] = useState<number>(30)
  const [activeTraceSession, setActiveTraceSession] = useState<SpreadsheetTraceSession | null>(null)
  const activeTraceSessionRef = useRef<SpreadsheetTraceSession | null>(null)
  activeTraceSessionRef.current = activeTraceSession

  const [traceSessions, setTraceSessions] = useState<SpreadsheetTraceSession[]>([])
  const traceSessionsRef = useRef<SpreadsheetTraceSession[]>([])
  traceSessionsRef.current = traceSessions

  const [selectedTraceSessionId, setSelectedTraceSessionId] = useState<string | null>(null)
  const selectedTraceSessionIdRef = useRef<string | null>(null)
  selectedTraceSessionIdRef.current = selectedTraceSessionId

  const [traceEvents, setTraceEvents] = useState<SpreadsheetTraceEvent[]>([])
  const [traceFindings, setTraceFindings] = useState<SpreadsheetTraceFinding[]>([])
  const [isStartingTraceSession, setIsStartingTraceSession] = useState(false)
  const [isStoppingTraceSession, setIsStoppingTraceSession] = useState(false)
  const [isRefreshingTraceData, setIsRefreshingTraceData] = useState(false)

  const diagnosticsRefreshInFlightRef = useRef<Set<string>>(new Set())
  const lastAutomaticDiagnosticsRefreshKeyRef = useRef<string | null>(null)
  const pendingDiagnosticsEventsRef = useRef<SpreadsheetTraceEventInput[]>([])
  const diagnosticsFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setAndPersistActiveTraceSession = useCallback(
    (session: SpreadsheetTraceSession | null) => {
      const nextSession = session && !isSpreadsheetTraceSessionExpired(session) ? session : null
      setActiveTraceSession(nextSession)
      persistSpreadsheetTraceHint(appId, session?.sheetId ?? activeSheetIdRef.current, nextSession)
    },
    [appId, activeSheetIdRef]
  )

  const refreshDiagnosticsData = useCallback(
    async (traceSessionId?: string, options?: { force?: boolean }) => {
      const resolvedTraceSessionId =
        traceSessionId ?? selectedTraceSessionIdRef.current ?? activeTraceSessionRef.current?.id
      if (!resolvedTraceSessionId) return
      const traceSession =
        activeTraceSessionRef.current?.id === resolvedTraceSessionId
          ? activeTraceSessionRef.current
          : traceSessionsRef.current.find(session => session.id === resolvedTraceSessionId)
      const traceSheetId = traceSession?.sheetId ?? activeSheetIdRef.current
      const refreshKey = `${resolvedTraceSessionId}:${traceSheetId}`
      if (diagnosticsRefreshInFlightRef.current.has(refreshKey)) return
      if (!options?.force && lastAutomaticDiagnosticsRefreshKeyRef.current === refreshKey) return
      diagnosticsRefreshInFlightRef.current.add(refreshKey)
      if (!options?.force) {
        lastAutomaticDiagnosticsRefreshKeyRef.current = refreshKey
      }
      setSelectedTraceSessionId(resolvedTraceSessionId)
      setIsRefreshingTraceData(true)
      try {
        const [eventsResponse, findingsResponse] = await Promise.all([
          SpreadsheetApiService.getDiagnosticsTraceEvents(appId, traceSheetId, {
            traceSessionId: resolvedTraceSessionId,
            visibilitySessionId: diagnosticsBrowserSessionIdRef.current,
            visibilityTabId: diagnosticsTabIdRef.current,
            limit: 400
          }),
          SpreadsheetApiService.getDiagnosticsTraceFindings(appId, traceSheetId, resolvedTraceSessionId, {
            visibilitySessionId: diagnosticsBrowserSessionIdRef.current,
            visibilityTabId: diagnosticsTabIdRef.current
          })
        ])
        if (eventsResponse.session && !isSpreadsheetTraceSessionExpired(eventsResponse.session)) {
          setAndPersistActiveTraceSession(eventsResponse.session)
        }
        setTraceEvents(eventsResponse.events)
        setTraceFindings(findingsResponse.findings)
      } finally {
        diagnosticsRefreshInFlightRef.current.delete(refreshKey)
        setIsRefreshingTraceData(false)
      }
    },
    [appId, setAndPersistActiveTraceSession, activeSheetIdRef]
  )

  const refreshDiagnosticsTraceSessions = useCallback(async (): Promise<SpreadsheetTraceSession[]> => {
    const response = await SpreadsheetApiService.getDiagnosticsTraceSessions(appId, activeSheetIdRef.current, {
      visibilitySessionId: diagnosticsBrowserSessionIdRef.current,
      visibilityTabId: diagnosticsTabIdRef.current,
      limit: 25
    })
    setTraceSessions(response.sessions)
    return response.sessions
  }, [appId, activeSheetIdRef])

  const flushDiagnosticsTraceEvents = useCallback(async () => {
    const queued = pendingDiagnosticsEventsRef.current
    if (queued.length === 0) return
    const currentTraceSession = activeTraceSessionRef.current
    const traceSessionId = currentTraceSession?.id ?? queued[0]?.traceSessionId ?? null
    if (!traceSessionId) return
    const traceSheetId = currentTraceSession?.sheetId ?? activeSheetIdRef.current
    pendingDiagnosticsEventsRef.current = []
    try {
      await SpreadsheetApiService.appendDiagnosticsTraceEvents(appId, traceSheetId, traceSessionId, {
        sessionId: diagnosticsBrowserSessionIdRef.current,
        tabId: diagnosticsTabIdRef.current,
        events: queued.map(event => {
          const nextEvent = { ...event }
          delete nextEvent.traceSessionId
          return nextEvent
        })
      })
      if (isDiagnosticsDialogOpenRef.current) {
        void refreshDiagnosticsData(traceSessionId, { force: true })
      }
    } catch (error) {
      debugLog('trace-event-flush-failed', {
        traceSessionId,
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }, [appId, activeSheetIdRef, debugLog, refreshDiagnosticsData])

  const scheduleDiagnosticsTraceFlush = useCallback(() => {
    if (diagnosticsFlushTimeoutRef.current) return
    diagnosticsFlushTimeoutRef.current = setTimeout(() => {
      diagnosticsFlushTimeoutRef.current = null
      void flushDiagnosticsTraceEvents()
    }, 500)
  }, [flushDiagnosticsTraceEvents])

  const enqueueDiagnosticsTraceEvent = useCallback(
    (event: SpreadsheetTraceEventInput) => {
      const currentTraceSession = activeTraceSessionRef.current
      const traceSessionId = event.traceSessionId ?? currentTraceSession?.id ?? null
      if (!traceSessionId) return
      if (!currentTraceSession || currentTraceSession.id !== traceSessionId) {
        void SpreadsheetApiService.getActiveDiagnosticsTraceSession(appId, activeSheetIdRef.current, {
          sessionId: diagnosticsBrowserSessionIdRef.current,
          tabId: diagnosticsTabIdRef.current
        })
          .then(session => {
            if (session) {
              setAndPersistActiveTraceSession(session)
            }
          })
          .catch(() => {
            /* ignore background hydration failures */
          })
      }
      pendingDiagnosticsEventsRef.current.push({
        ...event,
        sheetId: event.sheetId ?? activeSheetIdRef.current,
        traceSessionId,
        sessionId: event.sessionId ?? diagnosticsBrowserSessionIdRef.current,
        tabId: event.tabId ?? diagnosticsTabIdRef.current
      })
      scheduleDiagnosticsTraceFlush()
    },
    [appId, activeSheetIdRef, scheduleDiagnosticsTraceFlush, setAndPersistActiveTraceSession]
  )

  const startDiagnosticsTraceSession = useCallback(async () => {
    setIsStartingTraceSession(true)
    try {
      const session = await SpreadsheetApiService.startDiagnosticsTraceSession(appId, activeSheetIdRef.current, {
        scope: diagnosticsScope,
        ttlMinutes: diagnosticsTtlMinutes,
        sessionId: diagnosticsBrowserSessionIdRef.current,
        tabId: diagnosticsTabIdRef.current
      })
      setTraceEvents([])
      setTraceFindings([])
      setSelectedTraceSessionId(session.id)
      setTraceSessions(current => [session, ...current.filter(entry => entry.id !== session.id)])
      setAndPersistActiveTraceSession(session)
      await refreshDiagnosticsData(session.id, { force: true })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'diagnostics_trace_started',
        traceSessionId: session.id,
        payload: {
          scope: session.scope,
          ttlMinutes: session.ttlMinutes
        }
      })
    } catch (error) {
      toast.error('Failed to start spreadsheet diagnostics trace')
      debugLog('start-trace-session-failed', {
        message: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsStartingTraceSession(false)
    }
  }, [
    appId,
    activeSheetIdRef,
    diagnosticsScope,
    diagnosticsTtlMinutes,
    enqueueDiagnosticsTraceEvent,
    refreshDiagnosticsData,
    setAndPersistActiveTraceSession,
    debugLog
  ])

  const stopDiagnosticsTraceSession = useCallback(async () => {
    const traceSessionId = activeTraceSessionRef.current?.id
    if (!traceSessionId) return
    setIsStoppingTraceSession(true)
    try {
      await SpreadsheetApiService.stopDiagnosticsTraceSession(
        appId,
        activeTraceSessionRef.current?.sheetId ?? activeSheetIdRef.current,
        traceSessionId
      )
      setAndPersistActiveTraceSession(null)
      void refreshDiagnosticsTraceSessions()
    } catch (error) {
      toast.error('Failed to stop spreadsheet diagnostics trace')
      debugLog('stop-trace-session-failed', {
        traceSessionId,
        message: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsStoppingTraceSession(false)
    }
  }, [appId, activeSheetIdRef, refreshDiagnosticsTraceSessions, setAndPersistActiveTraceSession, debugLog])

  useEffect(() => {
    setSelectedTraceSessionId(null)
    setTraceSessions([])
    setTraceEvents([])
    setTraceFindings([])
    const hintedSession = readSpreadsheetTraceHint(appId, activeSheetId)
    if (hintedSession) {
      setAndPersistActiveTraceSession(hintedSession)
    } else if (!activeTraceSessionRef.current || isSpreadsheetTraceSessionExpired(activeTraceSessionRef.current)) {
      setAndPersistActiveTraceSession(null)
    }

    let cancelled = false
    void SpreadsheetApiService.getActiveDiagnosticsTraceSession(appId, activeSheetId, {
      sessionId: diagnosticsBrowserSessionIdRef.current,
      tabId: diagnosticsTabIdRef.current
    })
      .then(session => {
        if (cancelled) return
        if (session) {
          setAndPersistActiveTraceSession(session)
          void refreshDiagnosticsData(session.id)
        } else if (!activeTraceSessionRef.current || isSpreadsheetTraceSessionExpired(activeTraceSessionRef.current)) {
          setAndPersistActiveTraceSession(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        if (!hintedSession) {
          setAndPersistActiveTraceSession(null)
        }
      })

    const traceHintKey = getSpreadsheetTraceHintStorageKey(appId, activeSheetId)
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== traceHintKey) return
      const nextSession = readSpreadsheetTraceHint(appId, activeSheetId)
      setAndPersistActiveTraceSession(nextSession)
      if (nextSession) {
        void refreshDiagnosticsData(nextSession.id)
      }
    }
    globalThis.addEventListener('storage', handleStorage)
    return () => {
      cancelled = true
      globalThis.removeEventListener('storage', handleStorage)
    }
  }, [activeSheetId, appId, refreshDiagnosticsData, setAndPersistActiveTraceSession])

  useEffect(() => {
    if (!isDiagnosticsDialogOpen) return
    let cancelled = false
    void refreshDiagnosticsTraceSessions()
      .then(() => {
        if (cancelled) return
        const preferredTraceSessionId = activeTraceSessionRef.current?.id ?? selectedTraceSessionIdRef.current
        if (preferredTraceSessionId) {
          void refreshDiagnosticsData(preferredTraceSessionId)
        }
      })
      .catch(() => {
        /* keep the dialog usable even if history loading fails */
      })
    return () => {
      cancelled = true
    }
  }, [isDiagnosticsDialogOpen, refreshDiagnosticsData, refreshDiagnosticsTraceSessions])

  useEffect(() => {
    if (!activeTraceSession) return undefined
    if (isSpreadsheetTraceSessionExpired(activeTraceSession)) {
      setAndPersistActiveTraceSession(null)
      return undefined
    }
    const expiresAt = Date.parse(activeTraceSession.expiresAt)
    const timeoutId = setTimeout(
      () => {
        setAndPersistActiveTraceSession(null)
      },
      Math.max(0, expiresAt - Date.now() + 250)
    )
    return () => clearTimeout(timeoutId)
  }, [activeTraceSession, setAndPersistActiveTraceSession])

  useEffect(() => {
    return () => {
      if (diagnosticsFlushTimeoutRef.current) {
        clearTimeout(diagnosticsFlushTimeoutRef.current)
        diagnosticsFlushTimeoutRef.current = null
      }
      void flushDiagnosticsTraceEvents()
    }
  }, [flushDiagnosticsTraceEvents])

  return {
    showDiagnosticsButton,
    diagnosticsBrowserSessionIdRef,
    diagnosticsTabIdRef,
    isDiagnosticsDialogOpen,
    setIsDiagnosticsDialogOpen,
    isDiagnosticsDialogOpenRef,
    diagnosticsScope,
    setDiagnosticsScope,
    diagnosticsTtlMinutes,
    setDiagnosticsTtlMinutes,
    activeTraceSession,
    activeTraceSessionRef,
    traceSessions,
    selectedTraceSessionId,
    setSelectedTraceSessionId,
    selectedTraceSessionIdRef,
    traceEvents,
    traceFindings,
    setTraceEvents,
    setTraceFindings,
    isStartingTraceSession,
    isStoppingTraceSession,
    isRefreshingTraceData,
    setAndPersistActiveTraceSession,
    refreshDiagnosticsData,
    refreshDiagnosticsTraceSessions,
    enqueueDiagnosticsTraceEvent,
    startDiagnosticsTraceSession,
    stopDiagnosticsTraceSession
  }
}
