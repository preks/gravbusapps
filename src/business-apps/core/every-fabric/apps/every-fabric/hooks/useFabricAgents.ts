import { useCallback, useRef, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { AgentRegistryEntry } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'
import type { SpecialistAgent } from '../types/enterpriseAgent'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'

export interface UseFabricAgentsReturn {
  agents: SpecialistAgent[]
  isLoading: boolean
  error: Error | null
  /**
   * Lazily fetch the authorized enterprise agents on first use (e.g. when the
   * composer agent picker opens). Subsequent calls are no-ops while a fetch is
   * in flight or after a successful load; pass `{ force: true }` to refetch.
   */
  ensureLoaded: (opts?: { force?: boolean }) => Promise<void>
}

/**
 * Map an Agent Mesh registry entry to the lightweight `SpecialistAgent` shape
 * the composer carries in `SessionConfig.selectedAgent`.
 */
const mapRegistryEntryToSpecialist = (entry: AgentRegistryEntry): SpecialistAgent => ({
  id: entry.id,
  name: entry.name,
  display_name: entry.name,
  description: entry.description ?? '',
  domain: entry.specialty ?? entry.agent_card?.division ?? 'General',
  tags: entry.tags ?? [],
  is_active: entry.status !== 'archived'
})

/**
 * Loads the list of enterprise agents a user can assign to a session from the
 * composer. Backed by the Agent Mesh registry (`surface='enterprise'`, which
 * already excludes archived agents). Fetching is lazy so the landing screen
 * stays fast — call `ensureLoaded()` when the picker is first opened.
 */
export const useFabricAgents = (accessToken: string): UseFabricAgentsReturn => {
  const client = usePromptManagerClient(accessToken)
  const flowBotRuntime = isFlowBotFabricRuntime()
  const [agents, setAgents] = useState<SpecialistAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedRef = useRef(false)
  const inFlightRef = useRef(false)

  const ensureLoaded = useCallback(
    async (opts?: { force?: boolean }) => {
      if (flowBotRuntime) {
        setAgents([])
        return
      }
      if (!accessToken) return
      if (inFlightRef.current) return
      if (hasLoadedRef.current && !opts?.force) return

      inFlightRef.current = true
      setIsLoading(true)
      setError(null)
      try {
        const entries = await client.getAgentRegistry({ surface: 'enterprise', limit: 200 })
        const mapped = entries
          .filter(entry => entry.status !== 'archived')
          .map(mapRegistryEntryToSpecialist)
          .sort((a, b) => a.display_name.localeCompare(b.display_name))
        setAgents(mapped)
        hasLoadedRef.current = true
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setAgents([])
      } finally {
        setIsLoading(false)
        inFlightRef.current = false
      }
    },
    [accessToken, client, flowBotRuntime]
  )

  return { agents, isLoading, error, ensureLoaded }
}
