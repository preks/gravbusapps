import { useCallback, useMemo } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { ResponseType } from '@/common/network/rest/RestClient'
import type { DeepAgentSession, SessionConfig, SpecialistAgent } from '../types/enterpriseAgent'
import type { ArtifactFile } from '../types/fabric'
import { resolveRendererType } from '../types/fabric'

export const useEnterpriseAgentClient = (accessToken: string) => {
  const client = usePromptManagerClient(accessToken)

  const startSession = useCallback(
    (task: string, config?: SessionConfig, activeExternalConnectionIds?: string[]) =>
      client.post<{ session_id: string }>('/deep-agent/sessions', {
        task,
        config,
        active_external_connection_ids: activeExternalConnectionIds
      }),
    [client]
  )

  const getSession = useCallback(
    (sessionId: string) => client.get<DeepAgentSession>(`/deep-agent/sessions/${sessionId}`),
    [client]
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
      console.log('[replyToInterrupt] Called with:', {
        sessionId,
        message,
        structuredInput,
        hasStructuredInput: !!structuredInput,
        structuredInputType: typeof structuredInput,
        structuredInputKeys: structuredInput ? Object.keys(structuredInput) : null
      })
      // Build payload based on what's provided
      const payload: any = {}
      if (structuredInput) {
        payload.structured_input = structuredInput
        console.log('[replyToInterrupt] Added structured_input to payload:', payload.structured_input)
      }
      if (message && message.trim()) {
        payload.message = message
        console.log('[replyToInterrupt] Added message to payload:', payload.message)
      }
      console.log('[replyToInterrupt] Final payload check:', {
        hasStructuredInput: !!payload.structured_input,
        hasMessage: !!payload.message,
        payload
      })
      // Ensure at least one is provided
      if (!payload.structured_input && !payload.message) {
        console.error('[replyToInterrupt] VALIDATION ERROR - payload:', JSON.stringify(payload))
        throw new Error('Either message or structured_input must be provided')
      }
      console.log('[replyToInterrupt] Sending POST with payload:', JSON.stringify(payload))
      return client.post(`/deep-agent/sessions/${sessionId}/message`, payload)
    },
    [client]
  )

  const stopSession = useCallback((sessionId: string) => client.delete(`/deep-agent/sessions/${sessionId}`), [client])

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

  const getMetrics = useCallback(
    (from: string, to: string) => client.get('/deep-agent/metrics', { params: { from, to } }),
    [client]
  )

  const listSpecialistAgents = useCallback(
    () => client.get<SpecialistAgent[]>('/autonomous-agents/agents', { params: { limit: '50' } }),
    [client]
  )

  const createSpecialistAgent = useCallback(
    (data: {
      name: string
      display_name: string
      description: string
      domain: string
      system_prompt: string
      tags: string[]
    }) => client.post<SpecialistAgent>('/autonomous-agents/agents', data),
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
      getMemory,
      saveMemory,
      getMetrics,
      listSpecialistAgents,
      createSpecialistAgent,
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
      getMemory,
      saveMemory,
      getMetrics,
      listSpecialistAgents,
      createSpecialistAgent,
      listArtifacts,
      getArtifactUrl,
      getArtifactContent
    ]
  )
}
