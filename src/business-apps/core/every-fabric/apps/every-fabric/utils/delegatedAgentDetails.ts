import type {
  AgentExpertCalledEvent,
  AgentExpertCompletedEvent,
  AgentStreamEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent
} from '../types/enterpriseAgent'
import { resolveDelegatedAgentName } from './messageUtils'

/**
 * Normalised, human-friendly view of one delegated agent (an expert the main
 * agent consulted, or a sub-agent it spawned) for a single session.
 *
 * This is the single source of truth the clickable chat pill and the right-rail
 * timeline both open. It is derived purely from the session trace contract
 * (`expert_called` / `subagent_spawned` paired with their `*_completed`
 * counterpart by `step_id`), never from parsing opaque tool-result JSON — so
 * single delegations, spawned sub-agents, and the per-expert events emitted by
 * `newwork_ask_experts_parallel` all render identically.
 */
export type DelegatedAgentStatus = 'running' | 'done' | 'failed'

export interface DelegatedAgentTool {
  stepId: string
  name: string
  status: DelegatedAgentStatus
  durationMs?: number
}

export interface DelegatedAgentDetail {
  /** Backend `step_id`; stable key shared by the called/completed pair. */
  stepId: string
  /** Whether this came from an expert delegation or a spawned sub-agent. */
  source: 'expert' | 'subagent'
  /** Human-facing display name, e.g. "Customer 360 Analyst". */
  agentName: string
  /** What the agent was asked to do. */
  task: string
  /** Why this agent / what it specialises in, when the backend provides it. */
  description?: string
  status: DelegatedAgentStatus
  durationMs?: number
  /** Full completion output (rendered as markdown in the panel). */
  output?: string
  /** Child tool calls attributed to this delegation via `parent_step_id`. */
  tools: DelegatedAgentTool[]
  startedAt?: string
  completedAt?: string
}

type DelegationStartEvent = AgentExpertCalledEvent | AgentSubagentSpawnedEvent
type DelegationCompletionEvent = AgentExpertCompletedEvent | AgentSubagentCompletedEvent

const isDelegationStart = (event: AgentStreamEvent): event is DelegationStartEvent =>
  event.type === 'expert_called' || event.type === 'subagent_spawned'

const isDelegationCompletion = (event: AgentStreamEvent): event is DelegationCompletionEvent =>
  event.type === 'expert_completed' || event.type === 'subagent_completed'

const completionStatus = (completion?: DelegationCompletionEvent): DelegatedAgentStatus => {
  if (!completion) return 'running'
  return completion.status === 'failed' ? 'failed' : 'done'
}

const seqOf = (event: AgentStreamEvent): number =>
  'seq' in event && typeof event.seq === 'number' ? event.seq : Number.MAX_SAFE_INTEGER

/**
 * Some traces carry a `parent_step_id` linking a child tool call to the
 * delegation that issued it. The TS event types don't model it on the step
 * events, so we read it defensively.
 */
const parentStepIdOf = (event: AgentStreamEvent): string | undefined => {
  const candidate = (event as { parent_step_id?: unknown }).parent_step_id
  return typeof candidate === 'string' && candidate ? candidate : undefined
}

function collectToolsByParent(sorted: AgentStreamEvent[]): Map<string, DelegatedAgentTool[]> {
  const completionsByStep = new Map<string, { status: DelegatedAgentStatus; durationMs?: number }>()
  for (const event of sorted) {
    if (event.type === 'step_completed') {
      completionsByStep.set(event.step_id, {
        status: event.status === 'failed' ? 'failed' : 'done',
        durationMs: event.duration_ms
      })
    }
  }

  const toolsByParent = new Map<string, DelegatedAgentTool[]>()
  for (const event of sorted) {
    if (event.type !== 'step_started') continue
    const parent = parentStepIdOf(event)
    if (!parent) continue
    const completion = completionsByStep.get(event.step_id)
    const existing = toolsByParent.get(parent) ?? []
    existing.push({
      stepId: event.step_id,
      name: event.name ?? 'Tool',
      status: completion?.status ?? 'running',
      durationMs: completion?.durationMs
    })
    toolsByParent.set(parent, existing)
  }
  return toolsByParent
}

/**
 * Build a `step_id → DelegatedAgentDetail` map from the session trace.
 *
 * Pairs each delegation start with its completion, attributes child tool calls
 * by `parent_step_id`, and resolves a human-friendly name/task/output. The map
 * is keyed by `step_id` so the chat pill and the timeline row can open the
 * exact delegation by its stable id rather than matching on display name.
 */
export function buildDelegatedAgentDetails(events: AgentStreamEvent[]): Map<string, DelegatedAgentDetail> {
  const sorted = [...events].sort((a, b) => seqOf(a) - seqOf(b))

  const completionsByStep = new Map<string, DelegationCompletionEvent>()
  for (const event of sorted) {
    if (isDelegationCompletion(event)) {
      completionsByStep.set(event.step_id, event)
    }
  }

  const toolsByParent = collectToolsByParent(sorted)
  const details = new Map<string, DelegatedAgentDetail>()

  for (const event of sorted) {
    if (!isDelegationStart(event)) continue
    const completion = completionsByStep.get(event.step_id)
    const agentName = resolveDelegatedAgentName(event, completion)
    const task = event.task_summary ?? agentName
    const description = 'agent_description' in event ? event.agent_description : undefined

    details.set(event.step_id, {
      stepId: event.step_id,
      source: event.type === 'expert_called' ? 'expert' : 'subagent',
      agentName,
      task,
      description: description || undefined,
      status: completionStatus(completion),
      durationMs: completion?.duration_ms,
      output: typeof completion?.output === 'string' ? completion.output : undefined,
      tools: toolsByParent.get(event.step_id) ?? [],
      startedAt: event.timestamp,
      completedAt: completion?.timestamp
    })
  }

  return details
}
