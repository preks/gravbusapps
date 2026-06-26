// Local agent type for the Fabric agents screen.

import type { AgentDeployments } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'

export type { AgentDeployments } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'

export interface FabricAgent {
  id: string
  name: string
  /** Human-friendly label when distinct from the machine slug in ``name``. */
  display_name?: string | null
  description: string
  agent_type: string | null
  specialty: string | null
  domain?: string | null
  avatar: string | null
  color: string | null
  is_public: boolean | null
  tags: string[]
  tools_count: number
  /** Length (chars) of the agent's system prompt; null/undefined when unknown (e.g. workforce agents). */
  system_prompt_length?: number | null
  knowledge_sources_count: number
  skill_ids?: string[]
  skills_count?: number
  /** Tool refs attached to each of the agent's skills, keyed by skill_id. */
  skill_tools_by_id?: Record<string, string[]>
  source: string
  /** True when the agent is also on the Workforce surface (surfaces
   *  contains "workforce"). Drives the Workforce badge and the
   *  workforce-only config cards in the per-agent editor. */
  isWorkforce?: boolean
  /** Unified deployment view (Enterprise / Workforce) derived from the backend. */
  deployments?: AgentDeployments
  categories?: string[]
  status?: string
  created_at: string | null
}

/** Prefer ``display_name``; otherwise title-case the slug ``name``. */
export function agentDisplayLabel(agent: { display_name?: string | null; name: string }): string {
  const display = agent.display_name?.trim()
  if (display) return display
  return agent.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export type DeploymentBadgeTone = 'enterprise' | 'workforce' | 'paused' | 'archived'

export interface DeploymentBadge {
  key: string
  label: string
  tone: DeploymentBadgeTone
}

/**
 * Derive the deployment badges shown on an agent card from its unified
 * ``deployments`` view. Falls back to the legacy ``isWorkforce`` flag when the
 * backend has not yet supplied ``deployments`` (rollout compatibility).
 *
 * One agent can carry multiple badges (e.g. both Assistant and Worker).
 */
export function deriveDeploymentBadges(agent: Pick<FabricAgent, 'deployments' | 'isWorkforce'>): DeploymentBadge[] {
  const badges: DeploymentBadge[] = []
  const deployments = agent.deployments

  if (deployments) {
    if (deployments.enterprise.enabled) {
      badges.push({ key: 'enterprise', label: 'Assistant', tone: 'enterprise' })
    }
    const wf = deployments.workforce
    if (wf.status === 'active') {
      badges.push({ key: 'workforce', label: 'Worker', tone: 'workforce' })
    } else if (wf.status === 'paused') {
      badges.push({ key: 'workforce-paused', label: 'Worker paused', tone: 'paused' })
    } else if (agent.isWorkforce) {
      // The agent is in the Workforce collection but the deployments view has
      // not reported a workforce status yet (rollout lag). Trust the list.
      badges.push({ key: 'workforce', label: 'Worker', tone: 'workforce' })
    }
    return badges
  }

  // Legacy fallback: no deployments block yet.
  badges.push({ key: 'enterprise', label: 'Assistant', tone: 'enterprise' })
  if (agent.isWorkforce) {
    badges.push({ key: 'workforce', label: 'Worker', tone: 'workforce' })
  }
  return badges
}

/**
 * True when the agent has a live (active or paused) Workforce deployment.
 *
 * Treats the backend ``deployments`` view and the legacy ``isWorkforce`` flag
 * (membership in the Workforce collection) as a union: either signal is enough.
 * This keeps an agent classified as a Worker whether the backend reports it via
 * the unified deployments block or only via the separate workforce listing.
 */
export function hasWorkforceDeployment(agent: Pick<FabricAgent, 'deployments' | 'isWorkforce'>): boolean {
  if (agent.deployments?.workforce.enabled) return true
  return Boolean(agent.isWorkforce)
}

export interface BuiltinSubagent {
  id: string
  name: string
  description: string
  categories: string[]
  source: string
}
