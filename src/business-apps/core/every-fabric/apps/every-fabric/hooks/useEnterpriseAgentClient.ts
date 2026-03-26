import { useCallback, useMemo } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { DeepAgentSession, SessionConfig, SpecialistAgent } from '../types/enterpriseAgent'

export const useEnterpriseAgentClient = (accessToken: string) => {
  const client = usePromptManagerClient(accessToken)

  const startSession = useCallback(
    (task: string, config?: SessionConfig) =>
      client.post<{ session_id: string }>('/deep-agent/sessions', { task, config }),
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
    (sessionId: string, message: string) => client.post(`/deep-agent/sessions/${sessionId}/message`, { message }),
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
      createSpecialistAgent
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
      createSpecialistAgent
    ]
  )
}
