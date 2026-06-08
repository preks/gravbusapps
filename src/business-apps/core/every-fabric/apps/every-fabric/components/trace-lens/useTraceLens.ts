// Trace Lens — data hook.
//
// Lists Every Fabric runs and, for a selected run, fetches the full trace
// (`GET /deep-agent/sessions/{id}`) plus the backend debug-trace enrichment
// (`GET /deep-agent/sessions/{id}/debug-trace` → metadata.timings + diagnostics)
// and builds the normalized LangSmith-style model. Both endpoints already
// exist, so this works locally and against deployed environments with no
// backend changes.

import { useCallback, useEffect, useRef, useState } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import type { DeepAgentSession } from '../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { buildTraceLensModel, type DebugTracePayload, type TraceLensModel } from './traceLensModel'

const promptManagerBase = (): string =>
  PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL

async function fetchDebugTrace(sessionId: string, accessToken: string): Promise<DebugTracePayload | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (accessToken) headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
    const response = await fetch(
      `${promptManagerBase()}/deep-agent/sessions/${encodeURIComponent(sessionId)}/debug-trace`,
      {
        method: 'GET',
        headers,
        credentials: 'same-origin',
        mode: 'cors'
      }
    )
    if (!response.ok) return null
    return (await response.json()) as DebugTracePayload
  } catch {
    // Enrichment is best-effort — the raw trace alone still renders.
    return null
  }
}

export interface UseTraceLensResult {
  sessions: DeepAgentSession[]
  loadingSessions: boolean
  sessionsError: string | null
  refreshSessions: () => void

  selectedId: string | null
  selectSession: (id: string | null) => void

  model: TraceLensModel | null
  rawSession: DeepAgentSession | null
  loadingModel: boolean
  modelError: string | null
  refreshModel: () => void
}

export function useTraceLens(accessToken: string, initialSessionId?: string | null): UseTraceLensResult {
  const client = useEnterpriseAgentClient(accessToken)

  const [sessions, setSessions] = useState<DeepAgentSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(initialSessionId ?? null)
  const [model, setModel] = useState<TraceLensModel | null>(null)
  const [rawSession, setRawSession] = useState<DeepAgentSession | null>(null)
  const [loadingModel, setLoadingModel] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  const requestSeq = useRef(0)

  const refreshSessions = useCallback(() => {
    setLoadingSessions(true)
    setSessionsError(null)
    client
      .getSessions({ limit: 100 })
      .then(rows => setSessions(Array.isArray(rows) ? rows : []))
      .catch((err: unknown) => setSessionsError(err instanceof Error ? err.message : 'Failed to load sessions'))
      .finally(() => setLoadingSessions(false))
  }, [client])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const loadModel = useCallback(
    (id: string) => {
      const ticket = ++requestSeq.current
      setLoadingModel(true)
      setModelError(null)
      Promise.all([client.getSession(id, { bypassCache: true }), fetchDebugTrace(id, accessToken)])
        .then(([session, debug]) => {
          if (ticket !== requestSeq.current) return
          setRawSession(session)
          setModel(buildTraceLensModel(session, debug))
        })
        .catch((err: unknown) => {
          if (ticket !== requestSeq.current) return
          setModelError(err instanceof Error ? err.message : 'Failed to load trace')
          setModel(null)
          setRawSession(null)
        })
        .finally(() => {
          if (ticket === requestSeq.current) setLoadingModel(false)
        })
    },
    [client, accessToken]
  )

  const selectSession = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      if (id) loadModel(id)
      else {
        setModel(null)
        setRawSession(null)
      }
    },
    [loadModel]
  )

  // Load once on mount for a pre-selected id; later selections go via selectSession.
  const didMountLoad = useRef(false)
  useEffect(() => {
    if (didMountLoad.current) return
    didMountLoad.current = true
    if (selectedId) loadModel(selectedId)
  }, [selectedId, loadModel])

  const refreshModel = useCallback(() => {
    if (selectedId) loadModel(selectedId)
  }, [selectedId, loadModel])

  return {
    sessions,
    loadingSessions,
    sessionsError,
    refreshSessions,
    selectedId,
    selectSession,
    model,
    rawSession,
    loadingModel,
    modelError,
    refreshModel
  }
}
