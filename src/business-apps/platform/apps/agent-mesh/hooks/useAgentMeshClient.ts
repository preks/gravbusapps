import { useCallback, useMemo } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type {
  AgentRegistryEntry,
  Connection,
  ConnectionCreateRequest,
  ConnectionConfig,
  ConnectionAnalytics,
  ExecutionListItem,
  ExecutionLog,
  ExecutionTrace,
  ExecutionAnalytics,
  AlertRule,
  AlertRuleCreateRequest,
  ActiveAlert,
  MeshSession,
  SessionMessage,
  SessionCommEvent
} from '../types/agentMesh'

/**
 * Hook providing all Agent Mesh API operations.
 * Leverages the existing PromptManagerClient (same base URL).
 */
export const useAgentMeshClient = (accessToken: string) => {
  const client = usePromptManagerClient(accessToken)

  // --- Agent Registry ---
  const getAgentRegistry = useCallback(
    (params?: { workspaceId?: string; agentType?: string; division?: string }) => {
      const qp: Record<string, string> = {}
      if (params?.workspaceId) qp.workspaceId = params.workspaceId
      if (params?.agentType) qp.agentType = params.agentType
      if (params?.division) qp.division = params.division
      return client.get<AgentRegistryEntry[]>('/api/v1/agents/registry', { params: qp })
    },
    [client]
  )

  const getAgentDetail = useCallback(
    (agentId: string) => client.get<AgentRegistryEntry>(`/api/v1/agents/registry/${agentId}`),
    [client]
  )

  const updateAgentCard = useCallback(
    (
      agentId: string,
      data: { division?: string; data_domains?: string[]; capabilities?: string[]; access_policy?: string }
    ) => client.patch(`/api/v1/agents/registry/${agentId}/card`, data),
    [client]
  )

  // --- Connections ---
  const getConnections = useCallback(
    (params?: { status?: string; callerId?: string; calleeId?: string }) => {
      const qp: Record<string, string> = {}
      if (params?.status) qp.status = params.status
      if (params?.callerId) qp.callerId = params.callerId
      if (params?.calleeId) qp.calleeId = params.calleeId
      return client.get<Connection[]>('/api/v1/connections', { params: qp })
    },
    [client]
  )

  const getConnection = useCallback(
    (connectionId: string) => client.get<Connection>(`/api/v1/connections/${connectionId}`),
    [client]
  )

  const createConnection = useCallback(
    (data: ConnectionCreateRequest) => client.post<Connection>('/api/v1/connections', data),
    [client]
  )

  const updateConnection = useCallback(
    (connectionId: string, data: { config?: ConnectionConfig; status?: string }) =>
      client.put<Connection>(`/api/v1/connections/${connectionId}`, data),
    [client]
  )

  const deleteConnection = useCallback(
    (connectionId: string) => client.delete(`/api/v1/connections/${connectionId}`),
    [client]
  )

  const getConnectionAnalytics = useCallback(
    (connectionId: string, days?: number) => {
      const qp: Record<string, string | number> = {}
      if (days) qp.days = days
      return client.get<ConnectionAnalytics>(`/api/v1/connections/${connectionId}/analytics`, {
        params: qp as Record<string, string>
      })
    },
    [client]
  )

  // --- Executions ---
  const getExecutions = useCallback(
    (params?: Record<string, string | number>) => {
      const qp = params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined
      return client.get<ExecutionListItem[]>('/api/v1/executions', { params: qp })
    },
    [client]
  )

  const getExecutionDetail = useCallback(
    (executionId: string) => client.get<ExecutionLog>(`/api/v1/executions/${executionId}`),
    [client]
  )

  const getExecutionTrace = useCallback(
    (correlationId: string) => client.get<ExecutionTrace>(`/api/v1/executions/${correlationId}/trace`),
    [client]
  )

  const getExecutionAnalytics = useCallback(
    (params?: { days?: number; promptId?: string; connectionId?: string }) => {
      const qp: Record<string, string> = {}
      if (params?.days) qp.days = String(params.days)
      if (params?.promptId) qp.promptId = params.promptId
      if (params?.connectionId) qp.connectionId = params.connectionId
      return client.get<ExecutionAnalytics>('/api/v1/executions/analytics', { params: qp })
    },
    [client]
  )

  // --- Alerts ---
  const getAlertRules = useCallback(
    (params?: { status?: string; agentId?: string }) => {
      const qp: Record<string, string> = {}
      if (params?.status) qp.status = params.status
      if (params?.agentId) qp.agentId = params.agentId
      return client.get<AlertRule[]>('/api/v1/alerts/rules', { params: qp })
    },
    [client]
  )

  const createAlertRule = useCallback(
    (data: AlertRuleCreateRequest) => client.post<AlertRule>('/api/v1/alerts/rules', data),
    [client]
  )

  const updateAlertRule = useCallback(
    (ruleId: string, data: Partial<AlertRule>) => client.put<AlertRule>(`/api/v1/alerts/rules/${ruleId}`, data),
    [client]
  )

  const deleteAlertRule = useCallback((ruleId: string) => client.delete(`/api/v1/alerts/rules/${ruleId}`), [client])

  const getActiveAlerts = useCallback(() => client.get<ActiveAlert[]>('/api/v1/alerts/active'), [client])

  // --- Layout ---
  const getMeshLayout = useCallback(
    () => client.get<{ positions: Array<{ agent_id: string; x: number; y: number }> }>('/api/v1/agents/layout'),
    [client]
  )

  const saveMeshLayout = useCallback(
    (positions: Array<{ agent_id: string; x: number; y: number }>) =>
      client.put('/api/v1/agents/layout', { positions }),
    [client]
  )

  // --- Sessions ---
  const getSessions = useCallback(
    (params?: { userId?: string }) => {
      const qp: Record<string, string> = {}
      if (params?.userId) qp.userId = params.userId
      return client.get<MeshSession[]>('/api/v1/mesh-sessions', { params: qp })
    },
    [client]
  )

  const createSession = useCallback(
    (data: { user_id: string; agent_id: string; agent_name: string; title?: string }) =>
      client.post<MeshSession>('/api/v1/mesh-sessions', data),
    [client]
  )

  const getSession = useCallback(
    (sessionId: string) => client.get<MeshSession>(`/api/v1/mesh-sessions/${sessionId}`),
    [client]
  )

  const updateSession = useCallback(
    (
      sessionId: string,
      data: { messages?: SessionMessage[]; comm_events?: SessionCommEvent[]; result?: string; title?: string }
    ) => client.put<MeshSession>(`/api/v1/mesh-sessions/${sessionId}`, data),
    [client]
  )

  const deleteSession = useCallback(
    (sessionId: string) => client.delete(`/api/v1/mesh-sessions/${sessionId}`),
    [client]
  )

  return useMemo(
    () => ({
      getAgentRegistry,
      getAgentDetail,
      updateAgentCard,
      getConnections,
      getConnection,
      createConnection,
      updateConnection,
      deleteConnection,
      getConnectionAnalytics,
      getExecutions,
      getExecutionDetail,
      getExecutionTrace,
      getExecutionAnalytics,
      getAlertRules,
      createAlertRule,
      updateAlertRule,
      deleteAlertRule,
      getActiveAlerts,
      getMeshLayout,
      saveMeshLayout,
      getSessions,
      createSession,
      getSession,
      updateSession,
      deleteSession
    }),
    [
      getAgentRegistry,
      getAgentDetail,
      updateAgentCard,
      getConnections,
      getConnection,
      createConnection,
      updateConnection,
      deleteConnection,
      getConnectionAnalytics,
      getExecutions,
      getExecutionDetail,
      getExecutionTrace,
      getExecutionAnalytics,
      getAlertRules,
      createAlertRule,
      updateAlertRule,
      deleteAlertRule,
      getActiveAlerts,
      getMeshLayout,
      saveMeshLayout,
      getSessions,
      createSession,
      getSession,
      updateSession,
      deleteSession
    ]
  )
}
