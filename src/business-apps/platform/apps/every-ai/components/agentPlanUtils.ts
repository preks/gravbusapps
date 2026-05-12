import type {
  AgentPlanItem,
  AgentPlanOutput,
  AgentPlanUpdateOutput,
  ConversationTurn,
  OutputItem
} from '../types/models'

export interface LatestAgentPlan {
  planId: string
  items: AgentPlanItem[]
}

/**
 * Scan a list of OutputItems and return the most recent agent plan
 * snapshot, if any.
 *
 * The backend emits one `agent_plan` (initial snapshot) followed by zero
 * or more `agent_plan_update` events. We always return the LAST one we
 * find so the panel reflects the agent's current plan.
 */
export function selectLatestPlanFromOutputs(outputs: OutputItem[] | undefined | null): LatestAgentPlan | null {
  if (!outputs?.length) return null
  let latest: AgentPlanOutput | AgentPlanUpdateOutput | null = null
  for (const output of outputs) {
    if (!output) continue
    if (output.type === 'agent_plan' || output.type === 'agent_plan_update') {
      latest = output
    }
  }
  if (!latest) return null
  return { planId: latest.id, items: latest.items ?? [] }
}

/**
 * Walk the entire conversation backwards and return the most recent
 * agent plan snapshot from any agent turn.
 *
 * Used by the global plan panel rendered alongside the EveryAI chat:
 * it must persist the latest plan across the whole session, not just
 * the last turn — once the agent has produced a plan the panel keeps
 * showing it (even after follow-up turns that don't emit plan events).
 */
export function selectLatestAgentPlan(turns: ConversationTurn[] | undefined | null): LatestAgentPlan | null {
  if (!turns?.length) return null
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]
    if (turn.side !== 'agent') continue
    const plan = selectLatestPlanFromOutputs(turn.outputs)
    if (plan) return plan
  }
  return null
}
