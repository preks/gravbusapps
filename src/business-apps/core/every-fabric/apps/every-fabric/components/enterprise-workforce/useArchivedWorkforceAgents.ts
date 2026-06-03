// Data hook for the "Archived agents" recovery view.
//
// Kept separate from useWorkforceData so the default workforce listing
// stays a single fast roundtrip. The archived list is fetched lazily
// the first time the operator opens the view, then refreshed on demand
// or after a successful restore.

import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { normalizeWorkforceAgent, type WorkforceAgent } from './workforceTypes'

export interface UseArchivedWorkforceAgentsOptions {
  accessToken: string
  // Defer the initial fetch until the panel is actually opened.
  enabled: boolean
}

export interface UseArchivedWorkforceAgentsState {
  agents: WorkforceAgent[]
  isLoading: boolean
  isRestoring: string | null
  error: string | null
  refetch: () => Promise<void>
  restore: (agent: WorkforceAgent) => Promise<WorkforceAgent>
  clearError: () => void
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function useArchivedWorkforceAgents({
  accessToken,
  enabled
}: UseArchivedWorkforceAgentsOptions): UseArchivedWorkforceAgentsState {
  const client = usePromptManagerClient(accessToken)

  const [agents, setAgents] = useState<WorkforceAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const page = await client.listWorkforceAgents({ status: 'archived', limit: 200 })
      setAgents((page.data ?? []).map(normalizeWorkforceAgent))
    } catch (err) {
      setError(describeError(err, 'Failed to load archived agents.'))
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (!enabled) return
    void refetch()
  }, [enabled, refetch])

  const restore = useCallback(
    async (agent: WorkforceAgent): Promise<WorkforceAgent> => {
      setIsRestoring(agent.agent_id)
      setError(null)
      try {
        const restored = normalizeWorkforceAgent(await client.restoreWorkforceAgent(agent.agent_id))
        // Drop the restored agent from the archived list immediately so
        // the panel reflects the new state without waiting for refetch.
        setAgents(prev => prev.filter(a => a.agent_id !== agent.agent_id))
        return restored
      } catch (err) {
        const message = describeError(err, 'Failed to restore agent.')
        setError(message)
        throw err
      } finally {
        setIsRestoring(null)
      }
    },
    [client]
  )

  return {
    agents,
    isLoading,
    isRestoring,
    error,
    refetch,
    restore,
    clearError
  }
}
