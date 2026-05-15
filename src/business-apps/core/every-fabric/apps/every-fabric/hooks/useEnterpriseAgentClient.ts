import { useCallback, useMemo } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { ResponseType } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import type {
  DeepAgentSession,
  ModelOptionsResponse,
  ReasoningEffort,
  SessionAttachment,
  SessionConfig,
  StartSessionResponse
} from '../types/enterpriseAgent'
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
    ) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const selectedSkillIds = [
        activeEnterpriseSkillId,
        fallbackSkillId,
        config?.selectedEnterpriseSkill?.skill_id
      ].filter((value): value is string => Boolean(value))
      const selectedToolRefs = Array.from(new Set(config?.selectedEnterpriseSkill?.tool_refs ?? []))
      const selectedExpertId = config?.selectedAgent?.id
      const selectedExpertIds = selectedExpertId ? [selectedExpertId] : undefined
      return client.post<StartSessionResponse>('/deep-agent/sessions', {
        task,
        config,
        timezone,
        presentation_mode: 'enterprise_agents',
        active_external_connection_ids: activeExternalConnectionIds,
        expert_ids: selectedExpertIds,
        skill_ids: selectedSkillIds,
        tool_refs: selectedToolRefs
      })
    },
    [client]
  )

  const activateSession = useCallback(
    (sessionId: string) => client.post<StartSessionResponse>(`/deep-agent/sessions/${enc(sessionId)}/start`, {}),
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
    (
      sessionId: string,
      message?: string,
      structuredInput?: Record<string, any>,
      attachmentRefs?: Array<{ id: string; name: string; mime_type: string; size: number; indexing_status?: string }>
    ) => {
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
      if (attachmentRefs && attachmentRefs.length > 0) {
        payload.attachment_refs = attachmentRefs
      }
      return client.post(`/deep-agent/sessions/${sessionId}/message`, payload)
    },
    [client]
  )

  const fetchAttachmentContent = useCallback(
    async (sessionId: string, attachmentId: string): Promise<Blob> => {
      const base = resolvePromptManagerBase()
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
      }
      const response = await fetch(
        `${base}/deep-agent/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachmentId)}/content`,
        { method: 'GET', headers, credentials: 'same-origin', mode: 'cors' }
      )
      if (!response.ok) throw new Error(`Attachment fetch failed: ${response.status}`)
      return response.blob()
    },
    [accessToken]
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

  const listEnterpriseSkills = useCallback(async () => {
    const rows = await client.get<
      Array<{
        skill_id: string
        name: string
        description: string
        category?: string | null
        tags?: string[]
        tool_refs?: string[]
      }>
    >('/skills/manifest')
    return rows.map(row => ({
      id: row.skill_id,
      skill_id: row.skill_id,
      name: row.name,
      category: row.category ?? 'General',
      description: row.description,
      version: '1',
      is_active: true,
      publisher: 'Every Fabric',
      install_count: 0,
      onboarding_steps: row.tags ?? [],
      tool_refs: row.tool_refs ?? []
    }))
  }, [client])

  const getSkillDetails = useCallback(
    (skillId: string) => client.get<import('../types/enterpriseAgent').EnterpriseSkill>(`/skills/${skillId}`),
    [client]
  )

  const installSkill = useCallback(async (skillId: string) => ({ success: true, skill_id: skillId }), [])

  /** List all artifact files created during a session */
  const listArtifacts = useCallback(
    async (sessionId: string): Promise<ArtifactFile[]> => {
      const raw = await client.get<
        {
          name: string
          path: string
          mime_type: string
          size: number
          created_at: string
          modified_at: string
          provider_tool_ref?: string | null
          source_metadata?: unknown
        }[]
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
        provider_tool_ref: f.provider_tool_ref ?? null,
        source_metadata: f.source_metadata,
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

  // ── Admin Skills API ───────────────────────────────────────────────────────

  const enc = encodeURIComponent

  const getSkillsManifest = useCallback(async () => {
    const [adminSkills, runtimeSkills] = await Promise.all([
      client
        .get<
          {
            skill_id: string
            name: string
            description: string
            status: string
            is_active: boolean
            file_count: number
            tool_refs?: string[]
          }[]
        >('/admin/skills/')
        .catch(() => []),
      client
        .get<
          {
            skill_id: string
            name: string
            description: string
            category?: string | null
            tags?: string[]
            tool_refs?: string[]
            has_files?: boolean
          }[]
        >('/skills/manifest')
        .catch(() => [])
    ])

    const merged = new Map<
      string,
      {
        skill_id: string
        name: string
        description: string
        status: string
        is_active: boolean
        file_count: number
        has_files?: boolean
        tools?: string[]
        source?: 'admin' | 'runtime_manifest'
      }
    >()

    for (const skill of adminSkills) {
      merged.set(skill.skill_id, {
        ...skill,
        tools: skill.tool_refs ?? [],
        source: 'admin'
      })
    }

    for (const skill of runtimeSkills) {
      const existing = merged.get(skill.skill_id)
      if (existing) {
        merged.set(skill.skill_id, {
          ...existing,
          tools: Array.from(new Set([...(existing.tools ?? []), ...(skill.tool_refs ?? [])]))
        })
      } else {
        merged.set(skill.skill_id, {
          skill_id: skill.skill_id,
          name: skill.name,
          description: skill.description,
          status: 'built_in',
          is_active: true,
          file_count: 0,
          has_files: skill.has_files,
          tools: skill.tool_refs ?? [],
          source: 'runtime_manifest'
        })
      }
    }

    return { skills: [...merged.values()].sort((a, b) => a.skill_id.localeCompare(b.skill_id)) }
  }, [client])

  const createSkillFromForm = useCallback(
    (payload: { name: string; description: string; body: string }) =>
      client.post<{ skill_id: string }>('/admin/skills/', payload),
    [client]
  )

  const uploadSkillFile = useCallback(
    async (file: File): Promise<{ skill_id: string }> => {
      const formData = new FormData()
      formData.append('file', file)
      return client.post<{ skill_id: string }>('/admin/skills/upload', formData)
    },
    [client]
  )

  const saveSkillRaw = useCallback(
    (skillId: string, content: string) =>
      client.patch<{ skill_id: string; name: string; description: string; content: string }>(
        `/admin/skills/${enc(skillId)}`,
        { content }
      ),
    [client]
  )

  const getSkill = useCallback(
    (skillId: string) =>
      client.get<{ skill_id: string; name: string; description: string; content: string; status: string }>(
        `/admin/skills/${enc(skillId)}`
      ),
    [client]
  )

  const deleteSkill = useCallback((skillId: string) => client.delete(`/admin/skills/${enc(skillId)}`), [client])

  const uploadSkillFiles = useCallback(
    async (skillId: string, files: File[]) => {
      const results: { path: string; mime_type: string; size: number }[] = []
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f)
        const res = await client.post<{ path: string; size: number }>(
          `/admin/skills/${enc(skillId)}/files/upload`,
          fd,
          { params: { path: f.name } }
        )
        results.push({ path: res.path, mime_type: f.type || 'application/octet-stream', size: res.size })
      }
      return results
    },
    [client]
  )

  const listSkillFiles = useCallback(
    (skillId: string) =>
      client.get<{ path: string; mime_type: string; size: number }[]>(`/admin/skills/${enc(skillId)}/files`),
    [client]
  )

  /**
   * Resolve titles for intranet policies (ContentEntry.contentGroup = POLICY)
   * attached to a skill via `policy_refs:` frontmatter. Backend returns the
   * policy_id verbatim when the gateway is unreachable, so callers can render
   * a usable chip even on partial failures.
   */
  const listSkillPolicies = useCallback(
    (skillId: string) => client.get<{ policy_id: string; title: string }[]>(`/skills/${enc(skillId)}/policies`),
    [client]
  )

  const deleteSkillFile = useCallback(
    (skillId: string, filename: string) => client.delete(`/admin/skills/${enc(skillId)}/files/${enc(filename)}`),
    [client]
  )

  const exportSkillBundle = useCallback(
    (skillId: string) => client.get<Blob>(`/admin/skills/${enc(skillId)}/export`, { responseType: ResponseType.BLOB }),
    [client]
  )

  const submitSkillForReview = useCallback(
    (skillId: string) => client.post<Record<string, unknown>>(`/admin/skills/${enc(skillId)}/submit`, {}),
    [client]
  )

  const approveSkill = useCallback(
    (skillId: string) => client.post<Record<string, unknown>>(`/admin/skills/${enc(skillId)}/approve`, {}),
    [client]
  )

  const archiveSkill = useCallback(
    (skillId: string) => client.post<Record<string, unknown>>(`/admin/skills/${enc(skillId)}/archive`, {}),
    [client]
  )

  const listArchivedSkills = useCallback(async () => {
    const skills = await client.get<{ skill_id: string; name: string; description: string; status: string }[]>(
      '/admin/skills/',
      { params: { include_archived: 'true' } as Record<string, string> }
    )
    return skills.filter(s => s.status === 'archived')
  }, [client])

  const enableSkill = useCallback(
    (skillId: string) => client.post<Record<string, unknown>>(`/admin/skills/${enc(skillId)}/enable`, {}),
    [client]
  )

  const disableSkill = useCallback(
    (skillId: string) => client.post<Record<string, unknown>>(`/admin/skills/${enc(skillId)}/disable`, {}),
    [client]
  )

  // ── Session attachments (RAG over composer uploads) ────────────────────
  const uploadSessionAttachment = useCallback(
    async (
      sessionId: string,
      file: File,
      opts?: { spaceId?: string; folderId?: string }
    ): Promise<SessionAttachment> => {
      const formData = new FormData()
      formData.append('file', file)
      if (opts?.spaceId) formData.append('spaceId', opts.spaceId)
      if (opts?.folderId) formData.append('folderId', opts.folderId)
      return client.post<SessionAttachment>(`/deep-agent/sessions/${enc(sessionId)}/attachments`, formData)
    },
    [client]
  )

  const listSessionAttachments = useCallback(
    (sessionId: string) => client.get<SessionAttachment[]>(`/deep-agent/sessions/${enc(sessionId)}/attachments`),
    [client]
  )

  const deleteSessionAttachment = useCallback(
    (sessionId: string, attachmentId: string) =>
      client.delete(`/deep-agent/sessions/${enc(sessionId)}/attachments/${enc(attachmentId)}`),
    [client]
  )

  /**
   * Fetch the server's curated list of user-selectable primary models.
   * This is a read-only, unauthenticated-friendly endpoint — load once
   * per app mount via a shared React hook that caches the result.
   */
  const getModelOptions = useCallback(() => client.get<ModelOptionsResponse>('/agent-sessions/model-options'), [client])

  /**
   * Persist a new model + reasoning-effort choice on an existing session.
   * Applies to future turns only; does not interrupt any in-flight turn.
   */
  const updateSessionConfig = useCallback(
    (sessionId: string, modelId: string, reasoningEffort: ReasoningEffort) =>
      client.patch<{ session_id: string; model: string; reasoning_effort: string; effective_from: string }>(
        `/agent-sessions/sessions/${enc(sessionId)}/config`,
        { modelId, reasoningEffort }
      ),
    [client]
  )

  return useMemo(
    () => ({
      startSession,
      activateSession,
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
      getArtifactContent,
      getSkillsManifest,
      createSkillFromForm,
      uploadSkillFile,
      saveSkillRaw,
      getSkill,
      deleteSkill,
      uploadSkillFiles,
      listSkillFiles,
      listSkillPolicies,
      deleteSkillFile,
      exportSkillBundle,
      submitSkillForReview,
      approveSkill,
      archiveSkill,
      listArchivedSkills,
      enableSkill,
      disableSkill,
      uploadSessionAttachment,
      listSessionAttachments,
      deleteSessionAttachment,
      fetchAttachmentContent,
      getModelOptions,
      updateSessionConfig
    }),
    [
      startSession,
      activateSession,
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
      getArtifactContent,
      getSkillsManifest,
      createSkillFromForm,
      uploadSkillFile,
      saveSkillRaw,
      getSkill,
      deleteSkill,
      uploadSkillFiles,
      listSkillFiles,
      listSkillPolicies,
      deleteSkillFile,
      exportSkillBundle,
      submitSkillForReview,
      approveSkill,
      archiveSkill,
      listArchivedSkills,
      enableSkill,
      disableSkill,
      uploadSessionAttachment,
      listSessionAttachments,
      deleteSessionAttachment,
      fetchAttachmentContent,
      getModelOptions,
      updateSessionConfig
    ]
  )
}
