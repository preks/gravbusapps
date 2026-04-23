import { useCallback, useMemo } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { ResponseType } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import type { DeepAgentSession, SessionConfig, StartSessionResponse } from '../types/enterpriseAgent'
import type { ArtifactFile } from '../types/fabric'
import { resolveRendererType } from '../types/fabric'
import type { ActiveSessionsListResponse, ActiveSessionsSummaryResponse } from '../types/activeSession'

interface SessionCacheEntry {
  etag: string
  payload: DeepAgentSession
}

/**
 * Per-session ETag cache shared across every `useEnterpriseAgentClient`
 * invocation. The FE polls `GET /deep-agent/sessions/{id}` multiple times per
 * turn (fallback watchdog + terminal refetches + SSE reconnect), and the BE
 * now supports 304 Not Modified. Caching the last-seen payload lets us short
 * circuit those polls into a ~200 byte conditional request.
 */
const SESSION_ETAG_CACHE = new Map<string, SessionCacheEntry>()

const resolvePromptManagerBase = (): string =>
  PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL

export const useEnterpriseAgentClient = (accessToken: string) => {
  const client = usePromptManagerClient(accessToken)

  const startSession = useCallback(
    (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ) =>
      client.post<StartSessionResponse>('/deep-agent/sessions', {
        task,
        config,
        active_external_connection_ids: activeExternalConnectionIds,
        active_enterprise_skill_id: activeEnterpriseSkillId,
        fallback_skill_id: fallbackSkillId
      }),
    [client]
  )

  const getSession = useCallback(
    async (sessionId: string): Promise<DeepAgentSession> => {
      const cached = SESSION_ETAG_CACHE.get(sessionId)
      const base = resolvePromptManagerBase()
      const headers: Record<string, string> = {
        Accept: 'application/json'
      }
      if (accessToken) {
        headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
      }
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag
      }
      let response: Response
      try {
        response = await fetch(`${base}/deep-agent/sessions/${sessionId}`, {
          method: 'GET',
          headers,
          credentials: 'same-origin',
          mode: 'cors'
        })
      } catch {
        // Network failure: fall back to RestClient so the existing retry /
        // error-shape logic still applies.
        return client.get<DeepAgentSession>(`/deep-agent/sessions/${sessionId}`)
      }

      if (response.status === 304 && cached) {
        return cached.payload
      }

      if (!response.ok) {
        // Delegate to RestClient to produce a consistent error object and
        // drop any stale cache so we re-hydrate cleanly on recovery.
        SESSION_ETAG_CACHE.delete(sessionId)
        return client.get<DeepAgentSession>(`/deep-agent/sessions/${sessionId}`)
      }

      const payload = (await response.json()) as DeepAgentSession
      const etag = response.headers.get('ETag') ?? response.headers.get('etag')
      if (etag) {
        SESSION_ETAG_CACHE.set(sessionId, { etag, payload })
      } else {
        SESSION_ETAG_CACHE.delete(sessionId)
      }
      return payload
    },
    [client, accessToken]
  )

  const getSessions = useCallback(
    (params?: { limit?: number; status?: string }) =>
      client.get<DeepAgentSession[]>('/deep-agent/sessions', {
        params: params as Record<string, string>
      }),
    [client]
  )

  const replyToInterrupt = useCallback(
    (sessionId: string, message?: string, structuredInput?: Record<string, any>) => {
      const payload: Record<string, unknown> = {}
      if (structuredInput) {
        payload.structured_input = structuredInput
      }
      if (message?.trim()) {
        payload.message = message
      }
      if (!payload.structured_input && !payload.message) {
        console.error('[replyToInterrupt] Missing message and structured_input')
        throw new Error('Either message or structured_input must be provided')
      }
      return client.post(`/deep-agent/sessions/${sessionId}/message`, payload)
    },
    [client]
  )

  const stopSession = useCallback((sessionId: string) => client.delete(`/deep-agent/sessions/${sessionId}`), [client])

  const getActiveSessions = useCallback(
    (params?: { limit?: number }) =>
      client.get<ActiveSessionsListResponse>('/deep-agent/sessions/active', {
        params: params as Record<string, string> | undefined
      }),
    [client]
  )

  const getActiveSessionsSummary = useCallback(
    () => client.get<ActiveSessionsSummaryResponse>('/deep-agent/sessions/active/summary'),
    [client]
  )

  /**
   * Absolute SSE URL for the multiplexed active-sessions stream. Browsers can't
   * send custom headers on EventSource, so the JWT travels as a query param
   * (backend supports this — see `handlers.py:/sessions/active/stream`).
   */
  const buildActiveSessionsStreamUrl = useCallback((token: string): string => {
    const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
    return `${base}/deep-agent/sessions/active/stream?token=${encodeURIComponent(token)}`
  }, [])

  const getMemory = useCallback(
    (query: string) =>
      client.get<{ key: string; value: string; namespace?: string }[]>('/deep-agent/memory/search', {
        params: { q: query }
      }),
    [client]
  )

  const saveMemory = useCallback(
    (key: string, value: string, namespace?: string) => client.post('/deep-agent/memory', { key, value, namespace }),
    [client]
  )

  const deleteMemory = useCallback(
    (key: string, namespace?: string) =>
      client.delete('/deep-agent/memory', {
        params: { key, namespace: namespace ?? 'preferences' }
      }),
    [client]
  )

  const listEnterpriseSkills = useCallback(
    () =>
      client.get<import('../types/enterpriseAgent').EnterpriseSkill[]>('/enterprise-skills', {
        params: { is_active: 'true' }
      }),
    [client]
  )

  const getSkillDetails = useCallback(
    (skillId: string) =>
      client.get<import('../types/enterpriseAgent').EnterpriseSkill>(`/enterprise-skills/${skillId}`),
    [client]
  )

  const installSkill = useCallback(
    (skillId: string) =>
      client.post<{ success: boolean; skill_id: string }>(`/enterprise-skills/${skillId}/install`, {}),
    [client]
  )

  /** List all artifact files created during a session */
  const listArtifacts = useCallback(
    async (sessionId: string): Promise<ArtifactFile[]> => {
      const raw = await client.get<
        { name: string; path: string; mime_type: string; size: number; created_at: string; modified_at: string }[]
      >(`/deep-agent/sessions/${sessionId}/artifacts`)
      const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
      return raw.map(f => ({
        sessionId,
        artifactKey: f.path || f.name,
        name: f.name,
        path: f.path || f.name,
        mime_type: f.mime_type ?? '',
        size: f.size ?? 0,
        created_at: f.created_at ?? new Date().toISOString(),
        modified_at: f.modified_at ?? f.created_at ?? new Date().toISOString(),
        rendererType: resolveRendererType(f.mime_type, f.name),
        downloadUrl: `${base}/deep-agent/sessions/${sessionId}/artifacts/${encodeURIComponent(f.path || f.name)}`
      }))
    },
    [client]
  )

  /** Returns the direct download URL for an artifact file */
  const getArtifactUrl = useCallback((sessionId: string, filename: string): string => {
    const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
    return `${base}/deep-agent/sessions/${sessionId}/artifacts/${encodeURIComponent(filename)}`
  }, [])

  const getArtifactContent = useCallback(
    (sessionId: string, filename: string) =>
      client.get<string>(`/deep-agent/sessions/${sessionId}/artifacts/${encodeURIComponent(filename)}`, {
        responseType: ResponseType.TEXT
      }),
    [client]
  )

  return useMemo(
    () => ({
      startSession,
      getSession,
      getSessions,
      replyToInterrupt,
      stopSession,
      getActiveSessions,
      getActiveSessionsSummary,
      buildActiveSessionsStreamUrl,
      getMemory,
      saveMemory,
      deleteMemory,
      listEnterpriseSkills,
      getSkillDetails,
      installSkill,
      listArtifacts,
      getArtifactUrl,
      getArtifactContent
    }),
    [
      startSession,
      getSession,
      getSessions,
      replyToInterrupt,
      stopSession,
      getActiveSessions,
      getActiveSessionsSummary,
      buildActiveSessionsStreamUrl,
      getMemory,
      saveMemory,
      deleteMemory,
      listEnterpriseSkills,
      getSkillDetails,
      installSkill,
      listArtifacts,
      getArtifactUrl,
      getArtifactContent
    ]
  )
}
