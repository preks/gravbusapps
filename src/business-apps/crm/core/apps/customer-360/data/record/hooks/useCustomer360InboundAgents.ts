/**
 * useCustomer360InboundAgents — resolves which EveryFabric Workforce agents
 * surface their inbound-email runs in Customer 360.
 *
 * The set is user-configurable: an agent opts in via the "Show inbound runs in
 * Customer 360" toggle in its Enterprise Workforce settings, which adds the
 * `customer-360-inbound` tag. We resolve every tagged agent. When none has
 * opted in we fall back to the seeded analyst by name so the demo keeps working
 * out of the box — but the toggle is always the source of truth.
 *
 * Shared by the home Inbound stream (`useInboundRuns`) and the per-customer
 * agent activity section (`useCustomerAgentRuns`) so both honour the exact same
 * opt-in configuration.
 */

import { useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { hasCustomer360InboundTag } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'

/**
 * Fallback agent name (matches `AGENT_NAME` in
 * prompt-manager/scripts/customer_360_defs.py). Used only when no agent has
 * opted into Customer 360 via the toggle, so the seeded analyst keeps working.
 */
export const CUSTOMER_360_AGENT_NAME = 'customer_360_analyst'

export interface UseCustomer360InboundAgentsResult {
  /** Ids of every agent opted into Customer 360 inbound (by tag, or fallback). */
  agentIds: string[]
  /** True once the resolution attempt has finished. */
  resolved: boolean
  /** Set when the resolution request failed. */
  error: string | null
}

export function useCustomer360InboundAgents(accessToken: string): UseCustomer360InboundAgentsResult {
  const client = usePromptManagerClient(accessToken)
  const [agentIds, setAgentIds] = useState<string[]>([])
  const [resolved, setResolved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return undefined
    let cancelled = false
    setResolved(false)
    const resolveAgents = async () => {
      try {
        const result = await client.listWorkforceAgents({ status: 'active', limit: 200 })
        if (cancelled) return
        const agents = result.data ?? []
        const tagged = agents.filter(hasCustomer360InboundTag)
        const opted = tagged.length > 0 ? tagged : agents.filter(agent => agent.name === CUSTOMER_360_AGENT_NAME)
        setAgentIds(opted.map(agent => agent.agent_id))
        setError(null)
      } catch (err) {
        if (cancelled) return
        setAgentIds([])
        setError(err instanceof Error ? err.message : 'Failed to resolve the Customer 360 agents')
      } finally {
        if (!cancelled) setResolved(true)
      }
    }
    void resolveAgents()
    return () => {
      cancelled = true
    }
  }, [accessToken, client])

  return { agentIds, resolved, error }
}
